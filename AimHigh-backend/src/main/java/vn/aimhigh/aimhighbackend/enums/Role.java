package vn.aimhigh.aimhighbackend.enums;

public enum Role {
    STUDENT,
    ADMIN,
    SUPER_ADMIN,
    CONTENT_ADMIN,
    REVIEWER,
    SUPPORT;

    public boolean isAdminRole() {
        return this == ADMIN
                || this == SUPER_ADMIN
                || this == CONTENT_ADMIN
                || this == REVIEWER
                || this == SUPPORT;
    }
}
