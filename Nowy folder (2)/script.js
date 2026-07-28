let device;
let server;
let service;
let writeChar;
let notifyChar;

const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID   = "0000fff1-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID  = "0000fff2-0000-1000-8000-00805f9b34fb";

const speed = document.getElementById("speed");
const battery = document.getElementById("battery");
const voltage = document.getElementById("voltage");
const temp = document.getElementById("temperature");
const mode = document.getElementById("mode");
const odo = document.getElementById("odo");
const trip = document.getElementById("trip");
const status = document.getElementById("status");
const connectBtn = document.getElementById("connect");

connectBtn.onclick = connect;

async function connect(){

    try{

        device = await navigator.bluetooth.requestDevice({
            filters:[
                {services:[SERVICE_UUID]}
            ]
        });

        server = await device.gatt.connect();

        service = await server.getPrimaryService(SERVICE_UUID);

        writeChar = await service.getCharacteristic(WRITE_UUID);
        notifyChar = await service.getCharacteristic(NOTIFY_UUID);

        await notifyChar.startNotifications();

        notifyChar.addEventListener(
            "characteristicvaluechanged",
            handleNotify
        );

        status.innerHTML="🟢 Connected";
        connectBtn.innerHTML="Connected";

    }catch(e){
        console.log(e);
    }

}

function handleNotify(event){

    const value = new Uint8Array(event.target.value.buffer);

    console.log(value);

    parsePacket(value);

}
function parsePacket(data) {

    const b = Array.from(data);

    console.log(
        b.map(x => x.toString(16).padStart(2,"0")).join(" ")
    );

    // Sprawdzenie nagłówka
    if (b[0] !== 0x19 && b[0] !== 0x11) return;

    // ===========================
    // PRĘDKOŚĆ
    // ===========================
    let speedValue = b[5] / 2;

    if(speedValue > 45) speedValue = 45;

    speed.textContent = Math.round(speedValue);

    // ===========================
    // NAPIĘCIE
    // ===========================
    let rawVoltage = (b[8] << 8) | b[9];

    let volts = rawVoltage / 100;

    if(volts < 40 || volts > 70){
        volts = 54.6;
    }

    voltage.textContent = volts.toFixed(1) + "V";

    // ===========================
    // BATERIA
    // ===========================
    let batt = Math.round((volts - 42) / (54.6 - 42) * 100);

    batt = Math.max(0, Math.min(100, batt));

    battery.textContent = batt + "%";

    // ===========================
    // TEMPERATURA
    // ===========================
    temp.textContent = b[10] + "°C";

    // ===========================
    // TRYB
    // ===========================
    const modeByte = b[6];

    if(modeByte < 0x90)
        mode.textContent = "ECO";
    else if(modeByte < 0xA0)
        mode.textContent = "D";
    else
        mode.textContent = "SPORT";

    // ===========================
    // ODO
    // ===========================
    const odoValue =
        ((b[12] << 8) | b[13]) / 10;

    odo.textContent = odoValue.toFixed(1) + " km";

    // ===========================
    // TRIP
    // ===========================
    const tripValue =
        ((b[14] << 8) | b[15]) / 10;

    trip.textContent = tripValue.toFixed(1) + " km";
}