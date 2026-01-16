export default function ComponentOpener({
  openedComponent,
  componentTitle,
  componentId,
  toggleComponent,
}: ComponentOpenerProps) {
  const isOpen = openedComponent === componentId;

  const handleToggleComponent = () => {
    toggleComponent(componentId);
  };

  return (
    <li className="nav-item">
      <div
        className="nav-link-with-cursor"
        title={'Show/Hide' + componentTitle}
        onClick={handleToggleComponent}
      >
        <div className={isOpen ? 'active-opener' : 'inactive-opener'}>
          {componentTitle}
        </div>
      </div>
    </li>
  );
}

type ComponentOpenerProps = {
  openedComponent: string | null;
  componentTitle: string;
  componentId: string;
  toggleComponent: (componentId: string) => boolean;
};
