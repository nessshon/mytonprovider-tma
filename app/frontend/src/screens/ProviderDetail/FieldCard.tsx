import { Card } from "@/components/Card";
import { FieldRow } from "@/components/FieldRow";

export interface Field {
  label: string;
  value: string;
}

export function FieldCard({ rows }: { rows: Field[] }) {
  return (
    <Card>
      {rows.map((row, index) => (
        <FieldRow key={row.label} label={row.label} value={row.value} divider={index > 0} />
      ))}
    </Card>
  );
}
