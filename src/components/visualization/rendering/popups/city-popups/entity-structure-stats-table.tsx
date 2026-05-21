interface EntityStructureStatsTableProps {
  directDistrictCount: number;
  containedDistrictCount: number;
  directBuildingCount: number;
  containedBuildingCount: number;
}

export default function EntityStructureStatsTable({
  directDistrictCount,
  containedDistrictCount,
  directBuildingCount,
  containedBuildingCount,
}: EntityStructureStatsTableProps) {
  return (
    <table className="w-100">
      <tbody>
        <tr>
          <td>Direct Districts:</td>
          <td className="text-right text-break pl-1">{directDistrictCount}</td>
        </tr>
        <tr>
          <td>Contained Districts:</td>
          <td className="text-right text-break pl-1">
            {containedDistrictCount}
          </td>
        </tr>
        <tr>
          <td>Direct Buildings:</td>
          <td className="text-right text-break pl-1">{directBuildingCount}</td>
        </tr>
        <tr>
          <td>Contained Buildings:</td>
          <td className="text-right text-break pl-1">
            {containedBuildingCount}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
