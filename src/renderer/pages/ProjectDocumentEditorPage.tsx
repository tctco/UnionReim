// import { Button, Field, Input, Spinner, Title3, Toaster, makeStyles, tokens } from "@fluentui/react-components";
// import { Save24Regular } from "@fluentui/react-icons";
// import { useEffect, useMemo, useState } from "react";
// import { useLocation, useNavigate, useParams } from "react-router";
// import QuillEditor from "../components/Common/QuillEditor";
// import { formatWatermarkPlaceholderList } from "@common/watermarkPlaceholders";

// const useStyles = makeStyles({
//   container: { padding: 24, maxWidth: 1000, margin: "0 auto" },
//   section: { marginTop: 16, padding: 16, background: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusMedium },
// });

// function applyPlaceholders(html: string, values: Record<string, string>): string {
//   return html.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => {
//     const key = String(k);
//     return values[key] ?? `{${key}}`;
//   });
// }

// export function ProjectDocumentEditorPage() {
//   const styles = useStyles();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { pid, pdid } = useParams<{ pid: string; pdid: string }>();
//   const projectId = parseInt(pid || '0');
//   const projectDocumentId = pdid ? parseInt(pdid) : null;

//   const [loading, setLoading] = useState(true);
//   const [name, setName] = useState("");
//   const [html, setHtml] = useState<string>("<p></p>");
//   const [pdfRel, setPdfRel] = useState<string | undefined>(undefined);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       if (!projectDocumentId) { setLoading(false); return; }
//       const d = await window.ContextBridge.projectDocument.get(projectDocumentId);
//       if (mounted && d.success && d.data) {
//         setName(d.data.name);
//         setHtml(d.data.content_html || "<p></p>");
//         setPdfRel(d.data.pdf_path);
//       }
//       setLoading(false);
//     })();
//     return () => { mounted = false; };
//   }, [projectDocumentId]);

//   const fillKnownPlaceholders = async () => {
//     const settings = await window.ContextBridge.settings.get();
//     const proj = await window.ContextBridge.project.get(projectId);
//     const values: Record<string, string> = {};
//     if (settings.success && settings.data) {
//       if (settings.data.defaultUserName) values.userName = settings.data.defaultUserName;
//       if (settings.data.studentId) values.studentId = settings.data.studentId;
//     }
//     if (proj.success && proj.data) {
//       values.projectName = proj.data.name;
//       values.creator = proj.data.creator || '';
//     }
//     values.date = new Date().toISOString().slice(0, 10);
//     setHtml(prev => applyPlaceholders(prev, values));
//   };

//   const handleSave = async () => {
//     if (!projectDocumentId) return;
//     await window.ContextBridge.projectDocument.update({ project_document_id: projectDocumentId, name, content_html: html });
//     navigate(`/projects/${projectId}/edit`);
//   };

//   const handleExportPdf = async () => {
//     if (!projectDocumentId) return;
//     const res = await window.ContextBridge.projectDocument.exportPdf(projectDocumentId);
//     if (res.success && res.data) setPdfRel(res.data);
//   };

//   if (loading) {
//     return <div className={styles.container}><Spinner label="Loading..." /></div>;
//   }

//   return (
//     <div className={styles.container}>
//       <Toaster />
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <Title3>编辑项目文档</Title3>
//         <div style={{ display: 'flex', gap: 8 }}>
//           <Button onClick={() => navigate(`/projects/${projectId}/edit`)}>返回</Button>
//           <Button onClick={fillKnownPlaceholders}>填充常用占位符</Button>
//           <Button onClick={handleExportPdf}>导出PDF</Button>
//           <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave}>保存</Button>
//         </div>
//       </div>
//       <div className={styles.section}>
//         <Field label="名称"><Input value={name} onChange={(_, d) => setName(d.value)} /></Field>
//       </div>
//       <div className={styles.section}>
//         <div style={{ marginBottom: 8, color: tokens.colorNeutralForeground3 }}>
//           支持占位符：{formatWatermarkPlaceholderList()}
//         </div>
//         <QuillEditor initialHtml={html} onHtmlChange={setHtml} showToolbar={false} />
//         {pdfRel && (
//           <div style={{ marginTop: 8, color: tokens.colorNeutralForeground3 }}>PDF: {pdfRel}</div>
//         )}
//       </div>
//     </div>
//   );
// }
