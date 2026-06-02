package vn.aimhigh.aimhighbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AimHighBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(AimHighBackendApplication.class, args);
	}

}
