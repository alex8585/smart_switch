load('api_config.js');
load('api_dash.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_timer.js');
load('api_sys.js');

          
let led_pin = Cfg.get('board.led1.pin');           
let sensor_pin = Cfg.get('smart_switch.sensor_pin'); 
let switch_pin = Cfg.get('smart_switch.switch_pin'); 

let light_mode = Cfg.get('smart_switch.light_mode'); 
let light_time = Cfg.get('smart_switch.light_time');

let light_is_up = false;
let light_timer_id;

GPIO.set_mode(led_pin, GPIO.MODE_OUTPUT);
GPIO.set_mode(switch_pin, GPIO.MODE_OUTPUT);
GPIO.write(led_pin, 0);
GPIO.write(switch_pin, 0);

if(light_mode === 1) {
  switch_on_handler();
}

function switch_on_handler() {
  if(!light_is_up) {
    print('switch_on_handler');
    GPIO.write(led_pin, 1);
    GPIO.write(switch_pin, 1);
    light_is_up = true;
  }
}

function switch_off_handler() {
  if(light_is_up) {
    print('switch_off_handler');
    GPIO.write(led_pin, 0);
    GPIO.write(switch_pin, 0);
    light_is_up = false;
  }
}

let mgos_wifi_get_status = ffi('char* mgos_wifi_get_status_str()');

Timer.set(30000, Timer.REPEAT, function(){
  let wifi_status = mgos_wifi_get_status();
  if(wifi_status === 'disconnected' || wifi_status === 'connecting') {
    let is_ap = Cfg.get('wifi.ap.enable'); 
    if(!is_ap) {
      Cfg.set({wifi:{ap:{enable:true}}});
      print('AP enable true and system will reboot...');
      Sys.reboot(3000);
    }
  }
  print(wifi_status);
}, null);


GPIO.set_mode(sensor_pin, GPIO.MODE_INPUT);
GPIO.set_int_handler(sensor_pin, GPIO.INT_EDGE_POS, function() {

  if(light_mode === 2) {
    if(light_is_up) {
      Timer.del(light_timer_id);
    } else {
      switch_on_handler();
    }
  }

  light_timer_id = Timer.set(light_time  * 1000 ,0, function(){
    if(light_mode === 2) {
      switch_off_handler();
    }
  }, null);

}, null);
GPIO.enable_int(sensor_pin);


MQTT.sub('switch_35_light_mode', function(conn, topic, msg){
  light_mode = JSON.parse(msg);
  Cfg.set({smart_switch:{light_mode:light_mode}});
  if(light_mode === 1) {
    switch_on_handler();
  } else if (light_mode === 0) {
    switch_off_handler();
  }
}, null);

MQTT.sub('switch_35_light_time', function(conn, topic, msg){
  light_time = JSON.parse(msg);
  Cfg.set({smart_switch:{light_time:light_time}});
  
}, null);