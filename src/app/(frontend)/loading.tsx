export default function Loading() {
  return (
    <div className="v2-page v2-route-loading" role="status" aria-live="polite">
      <span className="sr-only">頁面載入中</span>
      <div className="v2-route-loading__hero" />
      <div className="v2-route-loading__body">
        <span /><span /><span />
      </div>
    </div>
  );
}
