import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';

export default function K8sPopup({ data }: any) {
  const k8sTitle = `K8s ${data.type}`;

  return (
    <div>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">
            K8s {data.type}
          </div>
          <CopyButton text={k8sTitle} />
        </div>
      </h3>
      <table className="table table-sm">
        <thead>
          <tr>
            <td>Name:</td>
            <td className="text-center">{data.name}</td>
          </tr>
        </thead>
      </table>
    </div>
  );
}
