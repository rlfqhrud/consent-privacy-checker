import { Fragment } from 'react';
import { CRITICAL, GROUPS } from '../lib/checks.js';

// 점검 항목 10개 판정표: 영역별로 묶고, 항목마다 판정 도장과 근거 조항
export default function Checklist({ items }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">검사 항목</th>
          <th scope="col" className="col-stamp">판정</th>
          <th scope="col" className="col-law">근거 조항</th>
        </tr>
      </thead>
      <tbody>
        {GROUPS.map((group) => (
          <Fragment key={group}>
            <tr className="group-row"><td colSpan={3}>{group}</td></tr>
            {items.filter((item) => item.group === group).map((item) => {
              const law = item.legal.split(' (')[0];
              const stamp = item.passed ? 'stamp pass' : `stamp fail${CRITICAL.includes(item.id) ? ' crit' : ''}`;
              return (
                <tr key={item.id}>
                  <td>
                    <span className="label">{item.label}</span>
                    {!item.passed && item.detail?.reason && <p className="reason">{item.detail.reason}</p>}
                    <p className="law-inline">{law}</p>
                  </td>
                  <td className="col-stamp"><span className={stamp}>{item.passed ? '충족' : '미충족'}</span></td>
                  <td className="col-law">{law}</td>
                </tr>
              );
            })}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
