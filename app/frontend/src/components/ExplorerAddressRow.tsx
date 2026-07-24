import { CopyRow } from "@/components/CopyRow";
import { explorerAddressUrl } from "@/lib/address";
import { shorten } from "@/lib/format";
import { useSettings } from "@/stores/settings";
import styles from "./ExplorerAddressRow.module.css";

interface ExplorerAddressRowProps {
  label: string;
  address: string;
  divider?: boolean;
}

export function ExplorerAddressRow({ label, address, divider }: ExplorerAddressRowProps) {
  const explorer = useSettings((s) => s.explorer);
  return (
    <CopyRow label={label} copyValue={address} divider={divider}>
      <a className={styles.link} href={explorerAddressUrl(address, explorer)} target="_blank" rel="noopener noreferrer">
        {shorten(address, 12)}
      </a>
    </CopyRow>
  );
}
