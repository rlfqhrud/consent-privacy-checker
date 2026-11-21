"""법령 지식베이스 검색 (RAG의 '검색' 단계).

외부 벡터DB·임베딩 API 없이 동작하도록 글자 2-gram TF-IDF + 코사인 유사도를 쓴다.
한국어는 띄어쓰기·조사가 제각각이라 단어 단위보다 글자 n-gram이 더 안정적이다.
조항 수가 적어(15개 내외) 매 요청마다 계산해도 1ms 안팎이다.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

KB_PATH = Path(__file__).with_name("law_articles.json")


@dataclass(frozen=True)
class Article:
    id: str
    law: str
    article: str
    title: str
    text: str

    @property
    def citation(self) -> str:
        return f"{self.law} {self.article}({self.title})"


def _ngrams(text: str, n: int = 2) -> Counter:
    t = re.sub(r"\s+", "", text.lower())
    return Counter(t[i : i + n] for i in range(max(0, len(t) - n + 1)))


class LawRetriever:
    def __init__(self, path: Path = KB_PATH):
        data = json.loads(path.read_text(encoding="utf-8"))
        self.articles = [
            Article(a["id"], a["law"], a["article"], a["title"], a["text"]) for a in data["articles"]
        ]
        # 제목·키워드는 본문보다 신호가 강하므로 두 번 넣어 가중치를 준다
        docs = []
        for a in data["articles"]:
            boost = " ".join([a["title"], *a.get("keywords", [])])
            docs.append(_ngrams(f"{boost} {boost} {a['text']}"))
        n_docs = len(docs)
        df = Counter(g for d in docs for g in d)
        self.idf = {g: math.log((1 + n_docs) / (1 + c)) + 1 for g, c in df.items()}
        self.vectors = [self._weigh(d) for d in docs]

    def _weigh(self, counts: Counter) -> dict[str, float]:
        vec = {g: c * self.idf.get(g, 0.0) for g, c in counts.items() if g in self.idf}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        return {g: v / norm for g, v in vec.items()}

    def search(self, query: str, k: int = 3) -> list[tuple[Article, float]]:
        q = self._weigh(_ngrams(query))
        scored = [
            (art, sum(w * vec.get(g, 0.0) for g, w in q.items()))
            for art, vec in zip(self.articles, self.vectors)
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [(a, s) for a, s in scored[:k] if s > 0]

    def by_id(self, article_id: str) -> Article | None:
        return next((a for a in self.articles if a.id == article_id), None)


@lru_cache(maxsize=1)
def get_retriever() -> LawRetriever:
    return LawRetriever()


def retrieve_for_checks(checks, consent_text: str, k_per_check: int = 2) -> list[Article]:
    """점검 항목마다 (항목 설명 + 판정 기준 + 동의서 앞부분)으로 검색해 관련 조항을 모은다."""
    r = get_retriever()
    snippet = consent_text[:400]
    seen: dict[str, Article] = {}
    for c in checks:
        query = f"{c.label} {c.criteria} {c.legal} {snippet}"
        for art, _ in r.search(query, k=k_per_check):
            seen.setdefault(art.id, art)
    return list(seen.values())
