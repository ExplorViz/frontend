export default function LoadingIndicator({ text }: { text: string }) {
  return (
    <div className="d-flex text-secondary">
      <div
        className="spinner-grow spinner-grow-sm"
        style={{ placeSelf: 'center' }}
        role="status"
      ></div>
      <span className="ml-1" style={{ placeSelf: 'center' }}>
        {text}
      </span>
    </div>
  );
}
