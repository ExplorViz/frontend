import React, { useCallback } from 'react';
import PropTypes from 'prop-types'; // Optional, for type checking

export default function ComponentOpener({
  openedComponent,
  componentTitle,
  componentId,
  toggleComponent,
}) {
  const isOpen = openedComponent === componentId;

  const handleToggleComponent = useCallback(() => {
    toggleComponent(componentId);
  }, [componentId, toggleComponent]);

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

ComponentOpener.propTypes = {
  openedComponent: PropTypes.string, // Or PropTypes.oneOf([PropTypes.string, PropTypes.oneOf([null])]) if null is allowed
  componentTitle: PropTypes.string.isRequired,
  componentId: PropTypes.string.isRequired,
  toggleComponent: PropTypes.func.isRequired,
};
