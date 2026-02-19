package com.example.demo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.server.ConfigurableWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.fasterxml.jackson.databind.ObjectMapper;


@SpringBootApplication
@RestController
@RequestMapping("/signal")
public class DemoApplication {

    

    private final ConcurrentHashMap<String,String> offer = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String,String> answer = new ConcurrentHashMap<>();

    private final Map<String,List<Map<String, Object>>> callerCandidates = new ConcurrentHashMap<>();

    private final Map<String, List<Map<String, Object>>> receiverCandidates = new ConcurrentHashMap<>();
    private final Map<String,String> callerUsername = new ConcurrentHashMap<>();
    
    private final Map<String,String> receiverUsername = new ConcurrentHashMap<>();


    private final Map<String,String> idpassword = new ConcurrentHashMap<>();
   

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }


    @PostMapping("/offer/{id}")
public void setOffer(@RequestBody Map<String, Object> data,
                     @PathVariable String id) throws Exception {

    ObjectMapper mapper = new ObjectMapper();

    
    String sdpJson = mapper.writeValueAsString(data.get("sdp"));

    String username = (String) data.get("username");

    callerUsername.put(id, username);
    offer.put(id, sdpJson);
}


    @GetMapping("/offer/{id}")
public Map<String, Object> getOffer(@PathVariable String id){

    String sdp = (String) offer.get(id);

    if(sdp == null) return Collections.emptyMap();

     Map<String, Object> response = new ConcurrentHashMap<>();
     response.put("sdp", sdp);
     response.put("username", callerUsername.get(id));
     offer.remove(id);
    return response;
}



    @PostMapping("/answer/{id}")
public void setAnswer(@RequestBody Map<String, Object> data,
                      @PathVariable String id) throws Exception {

    ObjectMapper mapper = new ObjectMapper();

    String sdpJson = mapper.writeValueAsString(data.get("sdp"));

    String username = (String) data.get("username");

    receiverUsername.put(id, username);
    answer.put(id, sdpJson);
}


    @GetMapping("/answer/{id}")
public Map<String, Object> getAnswer(@PathVariable String id) {
    String sdp = (String) answer.get(id);

    if(sdp == null) return Collections.emptyMap();

     Map<String, Object> response = new ConcurrentHashMap<>();
     response.put("sdp", sdp);
     response.put("username", receiverUsername.get(id));
     answer.remove(id);
    return response;
}
    @PostMapping("/createroom/{id}")
    public String createroom(@RequestBody String password,@PathVariable String id){
        if(idpassword.containsKey(id)){
            return "Already another room exists";
        }
        idpassword.put(id,password);
        return "Created";
    }
    
    @PostMapping ("/joinroom/{id}")
    public String joinroom(@RequestBody String password,@PathVariable String id){
        if(!idpassword.containsKey(id)){
            return "Room does not exist";
        }
        if(!idpassword.get(id).equals(password)){
            return "Wrong password";
        }
        return "Joined";
    }


    @PostMapping("/candidate/{id}")
public void addCandidate(@PathVariable String id,@RequestBody Map<String, Object> data) {

    String from = (String) data.get("from");

    Map<String, Object> candidate =(Map<String, Object>) data.get("candidate");

    if ("caller".equals(from)) {

        callerCandidates.computeIfAbsent(id, k -> Collections.synchronizedList(new ArrayList<>())).add(candidate);

    } else {

        receiverCandidates.computeIfAbsent(id, k -> Collections.synchronizedList(new ArrayList<>())).add(candidate);
    }
}

    @PostMapping("/cleanup/{id}")
    public void cleanup(@PathVariable String id){
        offer.remove(id);
        answer.remove(id);
        callerCandidates.remove(id);
        receiverCandidates.remove(id);
    }


    @GetMapping("/candidate/{target}/{id}")
    public List<Map<String, Object>> getCandidates(@PathVariable String target,@PathVariable String id) {

        if ("caller".equals(target)) {
            List<Map<String, Object>> list = new ArrayList<>(receiverCandidates.getOrDefault(id, Collections.emptyList()));

            receiverCandidates.remove(id);
            return list;
        } else {
            List<Map<String, Object>> list =new ArrayList<>(callerCandidates.getOrDefault(id, Collections.emptyList()));

            callerCandidates.remove(id);
            return list;
        }
    }
}


@Configuration
class ServerPortCustomizer implements WebServerFactoryCustomizer<ConfigurableWebServerFactory> {
    @Override
    public void customize(ConfigurableWebServerFactory factory) {
        String port = System.getenv("X_ZOHO_CATALYST_LISTEN_PORT");
        factory.setPort(port != null ? Integer.parseInt(port) : 8080);
    }
}


@Configuration
class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/signal/**")
                .allowedOrigins("*")
                .allowedMethods("*")
                .allowedHeaders("*");
    }
}
