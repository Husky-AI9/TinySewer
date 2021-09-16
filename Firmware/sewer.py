# main.py -- put your code here!
# MJPEG Streaming
#
# This example shows off how to do MJPEG streaming to a FIREFOX webrowser
# Chrome, Firefox and MJpegViewer App on Android have been tested.
# Connect to the IP address/port printed out from ifconfig to view the stream.
import sensor, image, time, network, socket, sys, os , tf
from mqtt import MQTTClient

from pyb import Pin, Timer

class PWM():
    def __init__(self, pin, tim, ch):
        self.pin = pin
        self.tim = tim
        self.ch = ch;

pwms = {
    'PWM7' : PWM('PH15', 8, 3),
}


SSID='Sonmai'      # Network SSID
KEY='ybo3122@'       # Network key
HOST =''     # Use first available interface
PORT = 8080  # Arbitrary non-privileged port

# Init sensor
sensor.reset()
sensor.set_framesize(sensor.QVGA)
sensor.set_pixformat(sensor.GRAYSCALE)

# Init wlan module and connect to network
print("Trying to connect... (This may take a while)...")
wlan = network.WLAN(network.STA_IF)
wlan.deinit()
wlan.active(True)
wlan.connect(SSID, KEY, timeout=30000)

# We should have a valid IP now via DHCP
print("WiFi Connected ", wlan.ifconfig())

# Create server socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, True)

# Bind and listen
print(PORT)
s.bind([HOST, PORT])
s.listen(5)

# Set server socket to blocking
s.setblocking(True)

# Model and labels
net = "trained.tflite"
labels = [line.rstrip('\n') for line in open("labels.txt")]

payload = MQTTClient("openmv", "broker.hivemq.com", port=1883)
payload.connect()


def callback(topic, msg):
    msg=msg.decode('utf-8')
    msg=msg.split("'")

    lightControl(int(msg[0]))

# must set callback first
payload.set_callback(callback)
payload.subscribe("TinySewer/light")


def start_streaming(s):
    print ('Waiting for connections..')
    client, addr = s.accept()
    # set client socket timeout to 5s
    client.settimeout(5.0)
    print ('Connected to ' + addr[0] + ':' + str(addr[1]))
    # Read request from client
    data = client.recv(1024)
    # Should parse client request here
    # Send multipart header
    client.sendall("HTTP/1.1 200 OK\r\n" \
                "Server: OpenMV\r\n" \
                "Content-Type: multipart/x-mixed-replace;boundary=openmv\r\n" \
                "Cache-Control: no-cache\r\n" \
                "Pragma: no-cache\r\n\r\n")
    # FPS clock
    clock = time.clock()
    # Start streaming images


    while (True):
        clock.tick() # Track elapsed milliseconds between snapshots().
        frame = sensor.snapshot()
        cframe = frame.compressed(quality=35)
        predict = prediction(frame)
        #print(predict)
        header = "\r\n--openmv\r\n" \
                 "Content-Type: image/jpeg\r\n"\
                 "Content-Length:"+str(cframe.size())+"\r\n\r\n"
        client.sendall(header)
        client.sendall(cframe)
        #client.sendall(bytes('POST /%s HTTP/1.0\r\nHost: 127.0.0.1:9990\r\n\r\n' % (predict), 'utf8'))
        payload.publish("openmv/test", str(predict))
        payload.check_msg() # poll for messages.

        print(clock.fps())

def prediction(img):
    prediction = ""
    #print("predict call")
    for obj in tf.classify(net, img, min_scale=1.0, scale_mul=0.8, x_overlap=0.5, y_overlap=0.5):
        #print("**********\nPredictions at [x=%d,y=%d,w=%d,h=%d]" % obj.rect())
        #frame.draw_rectangle(obj.rect())
        # This combines the labels and confidence values into a list of tuples
        predictions_list = list(zip(labels, obj.output()))
        #prediction = predictions_list[0][1] #defect confidence
        for i in range(len(predictions_list)):
            #print("%s = %f" % (predictions_list[i][0], predictions_list[i][1]))
            label = str(predictions_list[i][0])
            confident = str(predictions_list[i][1])
            prediction += label + ":" + confident + ","
            #name = (predictions_list[i][0])
            #if label != "normal" :
                #prediction = predictions_list[i][1]
    return prediction

def lightControl(percent):
    for k, pwm in pwms.items():
        tim = Timer(pwm.tim, freq=1000) # Frequency in Hz
        ch  = tim.channel(pwm.ch, Timer.PWM, pin=Pin(pwm.pin), pulse_width_percent=percent)

while (True):
    try:
        lightControl(20)
        start_streaming(s)
        print("main call")
    except OSError as e:
        print("socket error: ", e)
        #sys.print_exception(e)
