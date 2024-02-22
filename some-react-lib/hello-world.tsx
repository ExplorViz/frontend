export function HelloWorld({
  message,
  onClick,
}: {
  message: string;
  onClick: () => {};
}) {
  return (
    <div>
      <button onClick={onClick}>Toggle</button>
      <div>you said: {message}</div>
    </div>
  );
}
