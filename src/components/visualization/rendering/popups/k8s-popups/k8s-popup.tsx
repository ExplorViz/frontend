import React from 'react'; // Unused, but suppresses Typescript warning

export default function K8sPopup({ data }: any) {
  return (
    <div>
      <h3 className="popover-header">
        <div className="text-center text-break fw-bold pl-1">
          K8s {data.type}
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
