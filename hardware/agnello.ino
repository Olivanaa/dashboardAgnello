#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ======== DEFINIÇÕES DE PINOS ========
#define LDR 34         
#define DHTPIN 4
#define DHTTYPE DHT22

// ======== DHT ========
DHT dht(DHTPIN, DHTTYPE);

// ======== CONSTANTES ========
const float GAMMA = 0.7;
const float RL10 = 50.0; 
const int meia_luz = 60;
const int muito_claro = 100;

// ======== WI-FI E MQTT CONFIG ========
const char* default_SSID = "Wokwi-GUEST"; 
const char* default_PASSWORD = ""; 
const char* default_BROKER_MQTT = "107.23.174.107"; 
const int default_BROKER_PORT = 1883; 
const char* default_TOPICO_SUBSCRIBE = "/TEF/device007/cmd"; 
const char* default_TOPICO_PUBLISH_1 = "/TEF/device007/attrs"; 
const char* default_TOPICO_PUBLISH_2 = "/TEF/device007/attrs/l"; 
const char* default_TOPICO_PUBLISH_3 = "/TEF/device007/attrs/t"; 
const char* default_TOPICO_PUBLISH_4 = "/TEF/device007/attrs/u"; 
const char* default_ID_MQTT = "fiware_001"; 
const char* topicPrefix = "device007";

// Variáveis para configurações editáveis
char* SSID = const_cast<char*>(default_SSID);
char* PASSWORD = const_cast<char*>(default_PASSWORD);
char* BROKER_MQTT = const_cast<char*>(default_BROKER_MQTT);
int BROKER_PORT = default_BROKER_PORT;
char* TOPICO_SUBSCRIBE = const_cast<char*>(default_TOPICO_SUBSCRIBE);
char* TOPICO_PUBLISH_1 = const_cast<char*>(default_TOPICO_PUBLISH_1);
char* TOPICO_PUBLISH_2 = const_cast<char*>(default_TOPICO_PUBLISH_2);
char* TOPICO_PUBLISH_3 = const_cast<char*>(default_TOPICO_PUBLISH_3);
char* TOPICO_PUBLISH_4 = const_cast<char*>(default_TOPICO_PUBLISH_4);
char* ID_MQTT = const_cast<char*>(default_ID_MQTT);

WiFiClient espClient;
PubSubClient MQTT(espClient);

// ======== VARIÁVEIS ========
float voltage, resistance, lux, temp, umid;
int lum, lum_ldr;

// ======== FUNÇÕES ========
void initWiFi() {
    delay(10);
    Serial.println("------Conexao WI-FI------");
    Serial.print("Conectando-se na rede: ");
    Serial.println(SSID);
    Serial.println("Aguarde");
    reconectWiFi();
}

void reconectWiFi() {
    if (WiFi.status() == WL_CONNECTED)
        return;
    WiFi.begin(SSID, PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(100);
        Serial.print(".");
    }
    Serial.println();
    Serial.println("Conectado com sucesso na rede ");
    Serial.print(SSID);
    Serial.println("IP obtido: ");
    Serial.println(WiFi.localIP());
}

void initMQTT() {
  MQTT.setServer(BROKER_MQTT, BROKER_PORT);
}

void reconnectMQTT() {
  while (!MQTT.connected()) {
    Serial.print("* Tentando conectar ao broker MQTT: ");
    Serial.println(BROKER_MQTT);
    if (MQTT.connect(ID_MQTT)) {
      Serial.println("Conectado ao broker MQTT!");
      MQTT.subscribe(TOPICO_SUBSCRIBE);
    } else {
      Serial.println("Falha na conexão, tentando novamente...");
      delay(2000);
    }
  }
}

void VerificaConexoesWiFIEMQTT() {
    if (!MQTT.connected())
        reconnectMQTT();
    reconectWiFi();
}

// ======== SENSOR DE LUMINOSIDADE ========
void sensorLuminosidade(){
  lum_ldr = analogRead(LDR);
  lum = map(lum_ldr, 4095, 0, 1024, 0);
  voltage = lum / 1024.0 * 5;
  resistance = 2000 * voltage / (1 - voltage / 5); 
  lux = pow(RL10 * 1e3 * pow(10, GAMMA) / resistance, (1 / GAMMA));

  Serial.print("Leitura ADC: ");
  Serial.print(lum_ldr);
  Serial.print(" | Lum: ");
  Serial.print(lum);
  Serial.print(" | Lux: ");
  Serial.println(lux);

  String mensagemLumi = String(lux);
  MQTT.publish(default_TOPICO_PUBLISH_2, mensagemLumi.c_str());
}


// ======== SENSOR DHT22 ========
void sensorTempUmid(){     
  temp = dht.readTemperature();    
  umid = dht.readHumidity();                    
  
  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.print("°C | Umid: ");
  Serial.print(umid);
  Serial.print("%");

  String mensagemTemp = String(temp);
  MQTT.publish(default_TOPICO_PUBLISH_3, mensagemTemp.c_str());
  //String umidMsg = "umidade: " + String(umid);
  String mensagemUmid = String(umid);
  MQTT.publish(default_TOPICO_PUBLISH_4, mensagemUmid.c_str());
}


void setup() {
  Serial.begin(115200);
  dht.begin();  

  initWiFi();
  initMQTT();
}

void loop() {
  VerificaConexoesWiFIEMQTT();
  MQTT.loop();

  sensorLuminosidade();
  sensorTempUmid();

  if (lux <= meia_luz) {
    Serial.println("Ambiente escuro");
  } 
  else if (lux > meia_luz && lux < muito_claro) {
    Serial.println("Ambiente meia luz");
  } 
  else if (lux >= muito_claro) {
    Serial.println("Ambiente muito claro");
  }

  if(temp > 15){
    Serial.println("Temperatura alta");
  } 
  else if (temp < 10){
    Serial.println("Temperatura baixa");
  }

  if(umid < 50){
    Serial.println("Umidade baixa");
  }    
  else if(umid > 70){
    Serial.println("Umidade alta");
  }
}
