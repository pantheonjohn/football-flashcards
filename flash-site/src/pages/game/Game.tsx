import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import styles from "./Game.module.css";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Message } from "primereact/message";

type Play = {
  desc: string;
  qtr: string;
  time: string;
  down: number;
  ydstogo: string;
  posteam: string;
  defteam: string;
  home_team: string;
  away_team: string;
  home_timeouts_remaining: number;
  away_timeouts_remaining: number;
  score_differential: number;
  yardline_100: number;
  wpa: number;
};

const WPA_THRESHOLD = 0.08;

export const Game = ({ filename }: { filename: string }) => {
  const [plays, setPlays] = useState<Play[]>([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  useEffect(() => {
    setCurrentPlayIndex(0);
  }, [filename]);

  const toast = useRef<Toast>(null);

  useEffect(() => {
    const loadCsvFile = async (filename: string) => {
      const response = await fetch(`/games/${filename}`);
      const csvText = await response.text();

      // Parse CSV with headers as keys
      const parsed = Papa.parse(csvText, {
        header: true, // Use first row as keys
        dynamicTyping: true, // Convert numbers/booleans automatically
        skipEmptyLines: true, // Skip empty rows
        transformHeader: (header) => header.trim(), // Clean whitespace from headers
      });

      return parsed.data as Play[]; // Array of objects with column names as keys
    };
    loadCsvFile(filename).then((result) => setPlays(result));
  }, []);

  const currentPlay =
    currentPlayIndex < plays.length ? plays[currentPlayIndex] : undefined;

  return (
    <>
      {currentPlay ? (
        <div className={styles.gameContainer}>
          <Toast ref={toast} />
          <div
            className={styles.horizontalContainer}
            style={{ height: "43px" }}
          >
            <div
              style={{ width: "120px" }}
            >{`⏰ Q${currentPlay.qtr} ${currentPlay.time}`}</div>
            {typeof currentPlay.down === "number" && (
              <Message
                style={{ width: "120px" }}
                icon
                text={`${currentPlay.down}${
                  currentPlay.down === 1
                    ? "st"
                    : currentPlay.down === 2
                    ? "nd"
                    : currentPlay.down === 3
                    ? "rd"
                    : "th"
                } and ${currentPlay.ydstogo}`}
                severity={
                  currentPlay.down === 1
                    ? "success"
                    : currentPlay.down === 2
                    ? "info"
                    : currentPlay.down === 3
                    ? "warn"
                    : "error"
                }
              />
            )}
            {typeof currentPlay.score_differential === "number" && (
              <div
                style={{
                  fontWeight: "bold",
                  width: "120px",
                  textAlign: "right",
                }}
              >{`${
                currentPlay.score_differential === 0
                  ? "Tied"
                  : `${currentPlay.posteam} ${
                      currentPlay.score_differential > 0 ? "up by" : "down by"
                    } ${Math.abs(currentPlay.score_differential)}`
              }`}</div>
            )}
          </div>
          <div
            className={styles.horizontalContainer}
            style={{ marginTop: "-16px", marginBottom: "-16px" }}
          >
            <h3>{`${"⏸️".repeat(
              currentPlay.away_timeouts_remaining
            )}${"⚪".repeat(3 - currentPlay.away_timeouts_remaining)} ${
              currentPlay.away_team
            }${
              currentPlay.posteam === currentPlay.away_team ? " 🏈" : ""
            }`}</h3>
            <h3>{`${
              currentPlay.posteam === currentPlay.home_team ? "🏈 " : ""
            }${currentPlay.home_team} ${"⏸️".repeat(
              currentPlay.home_timeouts_remaining
            )}${"⚪".repeat(3 - currentPlay.home_timeouts_remaining)}`}</h3>
          </div>
          {typeof currentPlay.yardline_100 === "number" && (
            <div>{`${currentPlay.yardline_100} yards from the endzone`}</div>
          )}
          <div style={{ textAlign: "center" }}>{currentPlay.desc}</div>
          <div
            className={styles.horizontalContainer}
            style={{ marginTop: "auto" }}
          >
            <Button
              label="Back"
              text
              severity="secondary"
              disabled={currentPlayIndex === 0}
              onClick={() => {
                setCurrentPlayIndex(currentPlayIndex - 1);
              }}
            />
            <Button
              label="No click"
              severity="secondary"
              onClick={() => {
                setCurrentPlayIndex(currentPlayIndex + 1);
                if (Math.abs(currentPlay.wpa) < WPA_THRESHOLD) {
                  toast.current?.show({
                    severity: "success",
                    summary: "GOOD No Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                } else {
                  toast.current?.show({
                    severity: "error",
                    summary: "BAD No Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                }
              }}
            />
            <Button
              label={currentPlay.away_team}
              onClick={() => {
                setCurrentPlayIndex(currentPlayIndex + 1);
                if (
                  Math.abs(currentPlay.wpa) > WPA_THRESHOLD &&
                  currentPlay.posteam === currentPlay.away_team &&
                  currentPlay.wpa > 0
                ) {
                  toast.current?.show({
                    severity: "success",
                    summary: "GOOD Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                } else if (
                  Math.abs(currentPlay.wpa) > WPA_THRESHOLD &&
                  currentPlay.posteam === currentPlay.home_team &&
                  currentPlay.wpa < 0
                ) {
                  toast.current?.show({
                    severity: "success",
                    summary: "GOOD Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                } else {
                  toast.current?.show({
                    severity: "error",
                    summary: "BAD Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                }
              }}
            />
            <Button
              label={currentPlay.home_team}
              severity="warning"
              onClick={() => {
                setCurrentPlayIndex(currentPlayIndex + 1);
                if (
                  Math.abs(currentPlay.wpa) > WPA_THRESHOLD &&
                  currentPlay.posteam === currentPlay.home_team &&
                  currentPlay.wpa > 0
                ) {
                  toast.current?.show({
                    severity: "success",
                    summary: "GOOD Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                } else if (
                  Math.abs(currentPlay.wpa) > WPA_THRESHOLD &&
                  currentPlay.posteam === currentPlay.away_team &&
                  currentPlay.wpa < 0
                ) {
                  toast.current?.show({
                    severity: "success",
                    summary: "GOOD Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                } else {
                  toast.current?.show({
                    severity: "error",
                    summary: "BAD Bet",
                    detail: `WPA was ${(currentPlay.wpa * 100).toFixed(2)}%`,
                    life: 5000,
                  });
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div>No more plays</div>
      )}
    </>
  );
};
