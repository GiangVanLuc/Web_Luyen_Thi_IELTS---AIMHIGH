package vn.aimhigh.aimhighbackend.enums;

import java.util.EnumSet;
import java.util.Set;

public enum AdminPermission {
    DASHBOARD_VIEW,
    USER_VIEW,
    USER_CREATE,
    USER_UPDATE_ROLE,
    USER_LOCK,
    VOCAB_VIEW,
    VOCAB_CREATE,
    VOCAB_UPDATE,
    VOCAB_DELETE,
    VOCAB_IMPORT,
    EXAM_VIEW,
    EXAM_CREATE,
    EXAM_UPDATE,
    EXAM_DELETE,
    EXAM_IMPORT,
    EXAM_PUBLISH,
    SUBMISSION_VIEW,
    SUBMISSION_GRADE,
    NOTIFICATION_MANAGE,
    REPORT_VIEW,
    REPORT_EXPORT,
    SETTING_MANAGE,
    AUDIT_VIEW,
    AUDIT_EXPORT;

    public static Set<AdminPermission> defaultsFor(Role role) {
        if (role == null) {
            return Set.of();
        }
        return switch (role) {
            case ADMIN, SUPER_ADMIN -> EnumSet.allOf(AdminPermission.class);
            case CONTENT_ADMIN -> EnumSet.of(
                    DASHBOARD_VIEW,
                    VOCAB_VIEW, VOCAB_CREATE, VOCAB_UPDATE, VOCAB_DELETE, VOCAB_IMPORT,
                    EXAM_VIEW, EXAM_CREATE, EXAM_UPDATE, EXAM_DELETE, EXAM_IMPORT, EXAM_PUBLISH,
                    NOTIFICATION_MANAGE,
                    REPORT_VIEW
            );
            case REVIEWER -> EnumSet.of(DASHBOARD_VIEW, SUBMISSION_VIEW, SUBMISSION_GRADE, REPORT_VIEW);
            case SUPPORT -> EnumSet.of(DASHBOARD_VIEW, USER_VIEW, USER_LOCK);
            case STUDENT -> Set.of();
        };
    }
}
