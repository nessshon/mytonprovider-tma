import { BottomSheet } from "@/components/BottomSheet";
import { Card } from "@/components/Card";
import { CopyRow } from "@/components/CopyRow";
import { ExplorerAddressRow } from "@/components/ExplorerAddressRow";
import { FieldRow } from "@/components/FieldRow";
import type { ProblemBag } from "@/data/backend";
import { useT } from "@/i18n";
import { SC } from "@/lib/colors";
import { formatSpace, formatTime, shorten } from "@/lib/format";
import { reasonText, reasonTone } from "@/lib/status";
import styles from "./BagSheet.module.css";

const GATEWAY = "https://mytonstorage.org/api/v1/gateway/";

interface BagSheetProps {
  bag: ProblemBag;
  onClose: () => void;
}

export function BagSheet({ bag, onClose }: BagSheetProps) {
  const t = useT();
  const nowSec = Math.floor(Date.now() / 1000);

  return (
    <BottomSheet onClose={onClose}>
      {() => (
        <>
          <div className={styles.head} style={{ color: SC[reasonTone(bag.reason)] }}>
            {reasonText(bag.reason, t)}
          </div>
          <Card>
            <CopyRow label={t.bagId} copyValue={bag.bag_id}>
              <a className={styles.link} href={`${GATEWAY}${bag.bag_id}`} target="_blank" rel="noopener noreferrer">
                {shorten(bag.bag_id, 12).toUpperCase()}
              </a>
            </CopyRow>
            <ExplorerAddressRow label={t.bagContract} address={bag.address} divider />
            {bag.owner_address && <ExplorerAddressRow label={t.bagOwner} address={bag.owner_address} divider />}
            {bag.size != null && <FieldRow label={t.bagSize} value={formatSpace(bag.size, t)} divider />}
            <FieldRow label={t.bagCheckedLabel} value={t.ago(formatTime(nowSec - bag.reason_at, t, true))} divider />
            <FieldRow label={t.bagReason} value={bag.reason} divider />
          </Card>
          <a className={styles.openBtn} href={`${GATEWAY}${bag.bag_id}`} target="_blank" rel="noopener noreferrer">
            {t.bagOpen}
          </a>
        </>
      )}
    </BottomSheet>
  );
}
