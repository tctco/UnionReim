import { Button, Spinner, Title1, makeStyles, tokens } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toReimbursementUrlFromRelative } from "@common/urlHelpers";
import { AppBreadcrumb } from "../components/Layout/Breadcrumb";

const useStyles = makeStyles({
  container: {
    padding: "0px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  previewWrap: {
    flex: 1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  embed: {
    width: "100%",
    height: "100%",
    border: 0,
    display: "block",
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

export function PrintPreviewPage() {
  const styles = useStyles();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = parseInt(id || "0", 10);

  const [relativePath, setRelativePath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await window.ContextBridge.project.print(projectId);
        if (!active) return;
        if (res.success && res.data) {
          setRelativePath(res.data);
          setError(null);
        } else {
          setError(res.error || "Failed to generate PDF");
        }
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [projectId]);


  return (
    <div className={styles.container}>
      <div className={styles.previewWrap}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Spinner label="Generating PDF..." />
          </div>
        ) : error ? (
          <div style={{ padding: 24, color: tokens.colorPaletteRedForeground1 }}>
            {error}
          </div>
        ) : relativePath ? (
          <embed className={styles.embed} src={toReimbursementUrlFromRelative(relativePath)} type="application/pdf" />
        ) : (
          <div style={{ padding: 24 }}>No file to preview</div>
        )}
      </div>
    </div>
  );
}

export default PrintPreviewPage;
