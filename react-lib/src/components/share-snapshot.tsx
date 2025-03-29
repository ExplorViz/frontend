import { useState } from 'react';
import { format } from 'date-fns';
import {
  useSnapshotTokenStore,
  TinySnapshot,
} from 'react-lib/src/stores/snapshot-token';
import convertDate from 'react-lib/src/utils/helpers/time-convter';
import { ShareAndroidIcon } from '@primer/octicons-react';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';

const today: string = format(new Date().getTime() + 86400 * 1000, 'yyyy-MM-dd');

interface ShareSnapshotArgs {
  token: TinySnapshot;
  reload: () => void;
}

export default function ShareSnapshot(args: ShareSnapshotArgs) {
  const [setExpireDateMenu, setsetExpireDateMenu] = useState<boolean>(false);

  const [expDate, setExpDate] = useState<number | null>(null);

  const openMenu = () => {
    setsetExpireDateMenu(true);
  };

  const closeMenu = () => {
    setsetExpireDateMenu(false);
    setExpDate(null);
  };

  const updateExpDate = (event: React.FormEvent) => {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const date = convertDate(target.value);
    setExpDate(date);
  };

  const shareSnapshot = async (snapshot: TinySnapshot) => {
    const localExpDate = expDate !== null ? expDate : 0;

    await useSnapshotTokenStore.getState().shareSnapshot(snapshot, localExpDate);
    closeMenu();
    args.reload();
  };

  return (
    <div id="colorPresets" className="dropdown">
      <OverlayTrigger
        placement="bottom"
        trigger={['hover', 'focus']}
        overlay={<Tooltip>Share Snapshot</Tooltip>}
      >
        <a
          className="button-svg-with-hover"
          type="button"
          onClick={() => openMenu()}
        >
          <ShareAndroidIcon size="small" className="octicon align-middle" />
        </a>
      </OverlayTrigger>
      <Modal show={setExpireDateMenu} onHide={closeMenu}>
        <Modal.Header>
          <Modal.Title>
            Set expiry Date <i>- Optional</i>{' '}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between">
            <input
              id="date"
              className="form-control mr-2"
              type="date"
              min={today}
              onInput={updateExpDate}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={closeMenu}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => shareSnapshot(args.token)}>
            Upload
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
