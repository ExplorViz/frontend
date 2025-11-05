import {
  Method,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface ClazzMethodsListProps {
  methods: Method[];
}

function getMethodColorClass(originOfData: TypeOfAnalysis): string {
  switch (originOfData) {
    case TypeOfAnalysis.Static:
      return 'text-primary'; // Blue for static only
    case TypeOfAnalysis.Dynamic:
      return 'text-warning'; // Yellow for dynamic only
    case TypeOfAnalysis.StaticAndDynamic:
      return 'text-success'; // Green for dynamic and static
    default:
      return '';
  }
}

function getMethodOriginLabel(originOfData: TypeOfAnalysis): string {
  switch (originOfData) {
    case TypeOfAnalysis.Static:
      return 'Static';
    case TypeOfAnalysis.Dynamic:
      return 'Dynamic';
    case TypeOfAnalysis.StaticAndDynamic:
      return 'Static+Dynamic';
    default:
      return 'Unknown';
  }
}

export default function ClazzMethodsList({ methods }: ClazzMethodsListProps) {
  if (!methods || methods.length === 0) {
    return (
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Methods</h5>
          <p className="text-muted">No methods found in this class.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Methods ({methods.length})</h5>
        <div
          className="table-responsive"
          style={{ maxHeight: '400px', overflowY: 'auto' }}
        >
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '75%' }}>Name</th>
                <th style={{ width: '25%' }}>Origin</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((method) => {
                const colorClass = getMethodColorClass(method.originOfData);
                const originLabel = getMethodOriginLabel(method.originOfData);

                return (
                  <tr key={method.id || method.methodHash}>
                    <td>
                      <span style={{ fontWeight: 'bold' }}>{method.name}</span>
                    </td>
                    <td>
                      <span
                        className={colorClass}
                        style={{ fontWeight: 'bold' }}
                      >
                        {originLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
