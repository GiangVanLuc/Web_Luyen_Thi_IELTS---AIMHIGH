package vn.aimhigh.aimhighbackend.enums;

public enum Role {
    STUDENT,
    ADMIN;

    public boolean isAdminRole() {
        return this == ADMIN;
    }
}
