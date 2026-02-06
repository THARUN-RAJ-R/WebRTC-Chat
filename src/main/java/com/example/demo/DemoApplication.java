package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;



@SpringBootApplication
@RestController
@RequestMapping("/signal")
public class DemoApplication {

    private String offer = "";
    private String answer = "";

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    @PostMapping("/offer")
    public void setOffer(@RequestBody String sdp) {
        offer = sdp;
    }

    @GetMapping("/offer")
    public String getOffer() {
		String temp = offer;
		offer= "";
        return temp;
    }

    @PostMapping("/answer")
    public void setAnswer(@RequestBody String sdp) {
        answer = sdp;
    }

    @GetMapping("/answer")
    public String getAnswer() {
		String temp = answer;
		answer = "";
        return temp;
    }
}
