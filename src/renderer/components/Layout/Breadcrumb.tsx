import {
    Breadcrumb,
    BreadcrumbButton,
    BreadcrumbDivider,
    BreadcrumbItem,
    makeStyles,
} from "@fluentui/react-components";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";

const useStyles = makeStyles({
    breadcrumb: {
        padding: "12px 0",
    },
});

interface BreadcrumbSegment {
    label: string;
    path: string;
}

export function AppBreadcrumb() {
    const styles = useStyles();
    const location = useLocation();
    const navigate = useNavigate();
    const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);
    const { t } = useI18n();

    useEffect(() => {
        const pathSegments: BreadcrumbSegment[] = [];
        const path = location.pathname;

        // Don't show breadcrumbs for home page
        if (path === '/' || path === '/home') {
            setSegments([]);
            return;
        }

        // Parse the current path and generate breadcrumb segments
        if (path.startsWith('/templates')) {
            pathSegments.push({ label: t('breadcrumbs.templates'), path: '/templates' });
            
            if (path === '/templates/new') {
                pathSegments.push({ label: t('breadcrumbs.newTemplate'), path: '/templates/new' });
            } else if (path.match(/\/templates\/\d+$/)) {
                pathSegments.push({ label: t('breadcrumbs.viewTemplate'), path: path });
            } else if (path.match(/\/templates\/\d+\/edit$/)) {
                const templateId = path.match(/\/templates\/(\d+)\/edit$/)?.[1];
                pathSegments.push({ label: t('breadcrumbs.viewTemplate'), path: `/templates/${templateId}` });
                pathSegments.push({ label: t('breadcrumbs.edit'), path: path });
            }
        } else if (path.startsWith('/projects')) {
            pathSegments.push({ label: t('breadcrumbs.projects'), path: '/projects' });
            
            if (path === '/projects/new') {
                pathSegments.push({ label: t('breadcrumbs.newProject'), path: '/projects/new' });
            } else if (path.match(/\/projects\/\d+$/)) {
                pathSegments.push({ label: t('breadcrumbs.projectPreview'), path: path });
            } else if (path.match(/\/projects\/\d+\/edit$/)) {
                const projectId = path.match(/\/projects\/(\d+)\/edit$/)?.[1];
                pathSegments.push({ label: t('breadcrumbs.projectPreview'), path: `/projects/${projectId}` });
                pathSegments.push({ label: t('breadcrumbs.edit'), path: path });
            } else if (path.match(/\/projects\/\d+\/print$/)) {
                const projectId = path.match(/\/projects\/(\d+)\/print$/)?.[1];
                pathSegments.push({ label: t('breadcrumbs.projectPreview'), path: `/projects/${projectId}` });
                pathSegments.push({ label: t('breadcrumbs.print'), path: path });
            } else if (path.match(/\/projects\/\d+\/documents\/\d+\/edit$/)) {
                const m = path.match(/\/projects\/(\d+)\/documents\/(\d+)\/edit$/);
                const projectId = m?.[1];
                pathSegments.push({ label: t('breadcrumbs.projectPreview'), path: `/projects/${projectId}` });
                pathSegments.push({ label: t('breadcrumbs.documents'), path: `/projects/${projectId}/edit` });
                pathSegments.push({ label: t('breadcrumbs.editDocument'), path: path });
            }
        } else if (path.startsWith('/documents')) {
            pathSegments.push({ label: t('breadcrumbs.documents'), path: '/documents' });
            if (path === '/documents/new') {
                pathSegments.push({ label: t('breadcrumbs.newDocument'), path: '/documents/new' });
            } else if (path.match(/\/documents\/\d+$/)) {
                pathSegments.push({ label: t('breadcrumbs.editDocument'), path: path });
            }
        } else if (path.startsWith('/settings')) {
            pathSegments.push({ label: t('breadcrumbs.settings'), path: '/settings' });
        }

        setSegments(pathSegments);
    }, [location.pathname, t]);

    if (segments.length === 0) {
        return null;
    }

    return (
        <Breadcrumb className={styles.breadcrumb}>
            {segments.map((segment, index) => (
                <BreadcrumbItem key={segment.path}>
                    {index < segments.length - 1 ? (
                        <>
                            <BreadcrumbButton onClick={() => navigate(segment.path)}>
                                {segment.label}
                            </BreadcrumbButton>
                            <BreadcrumbDivider />
                        </>
                    ) : (
                        <BreadcrumbButton current>{segment.label}</BreadcrumbButton>
                    )}
                </BreadcrumbItem>
            ))}
        </Breadcrumb>
    );
}

