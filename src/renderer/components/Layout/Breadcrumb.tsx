import {
    Breadcrumb,
    BreadcrumbButton,
    BreadcrumbDivider,
    BreadcrumbItem,
    makeStyles,
} from "@fluentui/react-components";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

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

    useEffect(() => {
        const pathSegments: BreadcrumbSegment[] = [];
        const path = location.pathname;

        // Parse the current path and generate breadcrumb segments
        if (path.startsWith('/templates')) {
            pathSegments.push({ label: 'Templates', path: '/templates' });
            
            if (path === '/templates/new') {
                pathSegments.push({ label: 'New Template', path: '/templates/new' });
            } else if (path.match(/\/templates\/\d+$/)) {
                pathSegments.push({ label: 'View Template', path: path });
            } else if (path.match(/\/templates\/\d+\/edit$/)) {
                const templateId = path.match(/\/templates\/(\d+)\/edit$/)?.[1];
                pathSegments.push({ label: 'View Template', path: `/templates/${templateId}` });
                pathSegments.push({ label: 'Edit', path: path });
            }
        } else if (path.startsWith('/projects')) {
            pathSegments.push({ label: 'Projects', path: '/projects' });
            
            if (path === '/projects/new') {
                pathSegments.push({ label: 'New Project', path: '/projects/new' });
            } else if (path.match(/\/projects\/\d+$/)) {
                pathSegments.push({ label: 'Project Preview', path: path });
            } else if (path.match(/\/projects\/\d+\/edit$/)) {
                const projectId = path.match(/\/projects\/(\d+)\/edit$/)?.[1];
                pathSegments.push({ label: 'Project Preview', path: `/projects/${projectId}` });
                pathSegments.push({ label: 'Edit', path: path });
            } else if (path.match(/\/projects\/\d+\/print$/)) {
                const projectId = path.match(/\/projects\/(\d+)\/print$/)?.[1];
                pathSegments.push({ label: 'Project Preview', path: `/projects/${projectId}` });
                pathSegments.push({ label: 'Print', path: path });
            } else if (path.match(/\/projects\/\d+\/documents\/\d+\/edit$/)) {
                const m = path.match(/\/projects\/(\d+)\/documents\/(\d+)\/edit$/);
                const projectId = m?.[1];
                pathSegments.push({ label: 'Project Preview', path: `/projects/${projectId}` });
                pathSegments.push({ label: 'Documents', path: `/projects/${projectId}/edit` });
                pathSegments.push({ label: 'Edit Document', path: path });
            }
        } else if (path.startsWith('/documents')) {
            pathSegments.push({ label: 'Documents', path: '/documents' });
            if (path === '/documents/new') {
                pathSegments.push({ label: 'New Document', path: '/documents/new' });
            } else if (path.match(/\/documents\/\d+$/)) {
                pathSegments.push({ label: 'View Document', path: path });
            }
        }

        setSegments(pathSegments);
    }, [location.pathname]);

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

