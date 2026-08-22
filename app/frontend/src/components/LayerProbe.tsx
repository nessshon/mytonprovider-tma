import { getStartParam } from "@/lib/telegram";
import { useEffect, useState } from "react";
import styles from "./LayerProbe.module.css";

export function probeEnabled(): boolean {
  return location.search.includes("probe") || getStartParam() === "probe";
}

interface LayerProbeProps {
  dialogs: number;
  layers: number;
  layered: boolean;
}

export function LayerProbe({ dialogs, layers, layered }: LayerProbeProps) {
  const [sheets, setSheets] = useState({ total: 0, behind: 0 });

  useEffect(() => {
    const measure = () => {
      const nodes = [...document.querySelectorAll('[class*="_sheet_"]')];
      setSheets({ total: nodes.length, behind: nodes.filter((n) => n.className.includes("_behind_")).length });
    };
    measure();
    const timer = setInterval(measure, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.probe}>
      диалогов {dialogs} · слоёв {layers} · в DOM {sheets.total} · ужато {sheets.behind} · база{" "}
      {layered ? "заперта" : "жива"}
    </div>
  );
}
