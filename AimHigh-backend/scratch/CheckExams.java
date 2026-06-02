import java.sql.*;

public class CheckExams {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/aimhigh";
        String user = "root";
        String password = "123456";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            String sql = "SELECT id, title, skill, created_at FROM exams ORDER BY created_at DESC LIMIT 5";
            try (Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery(sql)) {
                System.out.println("Recent Exams:");
                while (rs.next()) {
                    System.out.println("ID: " + rs.getLong("id") + " | Title: " + rs.getString("title") + " | Skill: " + rs.getString("skill") + " | Created: " + rs.getTimestamp("created_at"));
                }
            }
        } catch (SQLException e) {
            System.err.println("Database error: " + e.getMessage());
        }
    }
}
