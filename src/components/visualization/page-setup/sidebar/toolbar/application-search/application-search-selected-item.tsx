interface ApplicationSearchSelectedItemProps {
  option: any;
  onClick: (clickedElement: any) => void;
}

export default function ApplicationSearchSelectedItem({
  option,
  onClick,
}: ApplicationSearchSelectedItemProps) {
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
