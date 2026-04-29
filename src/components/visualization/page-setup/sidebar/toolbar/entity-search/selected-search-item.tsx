interface SelectedSearchItemProps {
  option: any;
  onClick: (clickedElement: any) => void;
}

export default function SelectedSearchItem({
  option,
  onClick,
}: SelectedSearchItemProps) {
  if (option.className) {
    return (
      <a href="#" onClick={() => onClick(option)}>
        {option.className}
      </a>
    );
  } else if (option.fqn) {
    <a href="#" onClick={() => onClick(option)}>
      {option.fqn}
    </a>;
  }
  return <></>;
}
