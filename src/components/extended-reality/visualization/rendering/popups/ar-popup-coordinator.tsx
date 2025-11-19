import {
  Application,
  Class,
  isApplication,
  isClass,
  isNode,
  isPackage,
  Package,
} from '../../../../../utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from '../../../../../view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import ClazzPopup from '../../../../visualization/rendering/popups/application-popups/clazz/clazz-popup';
import CommunicationPopup from '../../../../visualization/rendering/popups/application-popups/communication/communication-popup';
import ComponentPopup from '../../../../visualization/rendering/popups/application-popups/component/component-popup';
import FoundationPopup from '../../../../visualization/rendering/popups/application-popups/foundation/foundation-popup';
import PopupData from '../../../../visualization/rendering/popups/popup-data';

interface ArPopupCoordinator {
  popupData: PopupData;
  showApplication(applicationId: string): void;
  toggleHighlightById(id: string): void;
  openParents(entity: Node | Application | Package | Class): void;
}

export default function ArPopupCoordinator({
  popupData,
  showApplication,
  toggleHighlightById,
  openParents,
}: ArPopupCoordinator) {
  const entityType = (() => {
    if (isNode(popupData.entity)) {
      return 'node';
    }
    if (isApplication(popupData.entity)) {
      return 'application';
    }
    if (isClass(popupData.entity)) {
      return 'class';
    }
    if (isPackage(popupData.entity)) {
      return 'package';
    }
    if (popupData.entity instanceof ClazzCommuMeshDataModel) {
      return 'classCommunication';
    }

    return '';
  })();

  return (
    <>
      {popupData && (
        <div className="ar-popover">
          {entityType == 'application' ? (
            <FoundationPopup popupData={popupData} restructureMode={false} />
          ) : entityType == 'package' ? (
            <ComponentPopup popupData={popupData} restructureMode={false} />
          ) : entityType == 'class' ? (
            <ClazzPopup popupData={popupData} restructureMode={false} />
          ) : (
            entityType == 'classCommunication' && (
              <CommunicationPopup
                popupData={popupData}
                restructureMode={false}
                showApplication={showApplication}
                toggleHighlightById={toggleHighlightById}
                openParents={openParents}
              />
            )
          )}
        </div>
      )}
    </>
  );
}
