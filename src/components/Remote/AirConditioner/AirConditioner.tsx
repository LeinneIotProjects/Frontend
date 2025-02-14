import React, {useState} from "react";

import './AirConditioner.scss';
import AirConditionerIcon from "../../../assets/icon/ac.png";
import {Button, Dropdown} from "react-bootstrap";
import RemoteBase from "../base/RemoteBase.tsx";
import {BsArrowDown, BsArrowUp} from "react-icons/bs";
import {isNumeric, JSONData} from "../../../utils/utils.ts";
import {useAuth} from "../../../feature/provider/AuthProvider.tsx";
import {useStorageState} from "../../../ui/utils/LocalStorage.tsx";
import {toastError} from "../../../feature/utils/toast.tsx";
import ACTimerModal from "./ACTimerModal.tsx";
import {ACReservationModal} from "./ACReservationModal/ACReservationModal.tsx";
import {RemoteBotDevice} from "../../../feature/component/device.ts";

interface SensorProps{
    humidity: any;
    temperature: any;
}

const Sensor: React.FC<SensorProps> = ({temperature, humidity}) => {
    const sensorValues = [
        ['온도', isNumeric(temperature) ? (+temperature).toFixed(1) + '°C' : '--'],
        ['습도', isNumeric(humidity) ? (+humidity).toFixed(1) + '%' : '--']
    ];

    return (
        <div className="d-flex flex-column justify-content-between gap-2" style={{flex: '5'}}>
            {sensorValues.map((value, index) => (
                <div className="sensor-data" key={index}>
                    현재 {value[0]}<br/>
                    {value[1]}
                </div>
            ))}
        </div>
    )
}

interface Props{
    device: RemoteBotDevice;
}

const AirConditioner: React.FC<Props> = ({device}) => {
    const {jwtFetch} = useAuth();

    const [timerModal, setTimerModal] = useState(false);
    const [reservationModal, setReservationModal] = useState(false);

    const [protocol, setProtocol] = useStorageState('aircon_protocol', 15);
    const [mode, setMode] = useStorageState('aircon_mode', 1);
    const [speed, setSpeed] = useStorageState('aircon_speed', 4);
    const [temperature, setTemperatureTemp] = useStorageState('aircon_temperature', 26);

    const setPowerAC = async (power: boolean) => {
        const json: JSONData = {power};
        if(power){
            json.protocol = protocol;
            json.mode = mode;
            json.speed = speed;
            json.temperature = temperature;
        }
        try{
            const res = await jwtFetch('/api/remote', {
                method: 'POST',
                body: JSON.stringify(json),
                headers: {"Content-Type": "application/json"},
            });
            if(!res.ok){
                const error = await res.json();
                toastError(error);
            }
        }catch(error: any){
            toastError(error.message)
        }
    };

    const setTemperature = (temperature: number) => {
        temperature = Math.max(Math.min(temperature, 30), 18);
        setTemperatureTemp(temperature)
    }

    return <RemoteBase>
        <ACTimerModal visibility={timerModal} setVisibility={setTimerModal}/>
        <ACReservationModal visibility={reservationModal} setVisibility={setReservationModal}/>
        <div className="d-flex gap-3" style={{minHeight: '176px', maxHeight: '200px'}}>
            {<Sensor temperature={device.temperature} humidity={device.humidity}/>}
            <div className="d-flex flex-column justify-content-between align-items-center" style={{flex: '13'}}>
                <img src={AirConditionerIcon} alt="에어컨" className="mt-3" style={{maxWidth: '44%'}}/>
                <div className="d-flex align-items-center" style={{fontSize: "1.6rem"}}>
                    <div>{temperature}°C</div>
                    <Button
                        variant="outline-primary"
                        className="ms-2 ac-temp-button"
                        onClick={() => setTemperature(temperature + 1)}
                    >
                        <BsArrowUp/>
                    </Button>
                    <Button
                        variant="outline-primary"
                        className="ms-1 ac-temp-button"
                        onClick={() => setTemperature(temperature - 1)}
                    >
                        <BsArrowDown/>
                    </Button>
                </div>
                <div className="d-flex gap-2">
                    <Button
                        variant="success"
                        onClick={() => setPowerAC(true)}
                    >
                        켜기
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => setPowerAC(false)}
                    >
                        끄기
                    </Button>
                </div>
            </div>
            <div className="d-flex flex-column gap-1 justify-content-between" style={{flex: '5'}}>
                <Dropdown>
                    <Dropdown.Toggle variant="outline-primary" id="modeButton" className="w-100">
                        {['자동', '냉방', '난방', '제습', '송풍'][mode]}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow">
                        {['냉방', '난방', '제습', '송풍'].map((text, index) =>
                            <Dropdown.Item
                                key={index}
                                active={mode === index + 1}
                                onClick={() => setMode(index + 1)}
                            >
                                {text}
                            </Dropdown.Item>
                        )}
                        <Dropdown.Divider/>
                        <Dropdown.Item active={mode === 0} onClick={() => setMode(0)}>
                            자동
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <Dropdown>
                    <Dropdown.Toggle variant="outline-success" id="speedButton" className="w-100">
                        {['강', '중', '약'][4 - speed] || '자동'}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow">
                        {['강', '중', '약'].map((text, index) =>
                            <Dropdown.Item
                                key={index}
                                active={speed === 4 - index}
                                onClick={() => setSpeed(4 - index)}
                            >
                                {text}
                            </Dropdown.Item>
                        )}
                        <Dropdown.Divider/>
                        <Dropdown.Item
                            active={speed === 0}
                            onClick={() => setSpeed(0)}
                        >
                            자동
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <Button
                    variant="outline-info"
                    onClick={() => setTimerModal(!timerModal)}
                >
                    타이머
                </Button>
                <Button
                    variant="outline-info"
                    onClick={() => setReservationModal(!reservationModal)}
                >
                    예약
                </Button>
            </div>
        </div>
    </RemoteBase>;
};
export default AirConditioner;