import {FC, createContext, useRef, useState, useContext, useEffect, ReactNode, Dispatch, SetStateAction} from 'react';
import {isNumeric, isObject, tryParseJson} from '../../utils/utils.ts';
import {useData} from './DataProvider.tsx';

export enum AuthStatus{
    NONE = -2,      // 미설정
    VERIFYING = -1, // 확인중
    FALSE = 0,     // 로그인 안됨
    TRUE = 1,      // 로그인됨
}

interface AuthContextProps{
    authStatus: AuthStatus;
    setAuthStatus: Dispatch<SetStateAction<AuthStatus>>;
    jwtFetch: (url: string, options?: RequestInit) => Promise<Response>;
    socket: WebSocket | null;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const useAuth = (): AuthContextProps => {
    const context = useContext(AuthContext);
    if(!context){
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps{
    children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({children}) => {
    const {dispatch} = useData();
    const socketRef = useRef<WebSocket | null>(null);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.NONE);

    /*const refreshToken = async (): Promise<boolean> => {
        const res = await fetch('/token/refresh', {
            method: 'POST',
            credentials: 'include'
        });
        return res.ok;
    }*/

    const jwtFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: options.headers || {}
        });
        if(response.status === 401){
            setAuthStatus(AuthStatus.FALSE);
        }
        return response;
    };

    useEffect(() => {
        if(authStatus == AuthStatus.NONE){
            setAuthStatus(AuthStatus.VERIFYING);
            jwtFetch(`/token/verify`, {method: 'POST'})
                .then(async (res) => {
                    setAuthStatus(res.ok ? AuthStatus.TRUE : AuthStatus.FALSE)
                    const user = await res.json();
                    dispatch({key: 'profile', value: user})
                })
                .catch(() => setAuthStatus(AuthStatus.FALSE));
        }
    }, [])

    useEffect(() => {
        let reconnectTimeout: any = null;
        const connectWebSocket = () => {
            if(!authStatus || (socketRef.current?.readyState || 3) <= WebSocket.OPEN){
                return;
            }
            const protocol = window.location.protocol.includes('https') ? 'wss://' : 'ws://';
            const webSocket = new WebSocket(`${protocol}${window.location.host}/ws`);
            webSocket.addEventListener('open', () => webSocket.send(JSON.stringify({method: 'JOIN_CLIENT'})));
            webSocket.addEventListener('message', (event) => {
                const data = tryParseJson(event.data);
                if(isNumeric(data.humidity)){
                    dispatch({
                        key: 'humidity',
                        value: isNumeric(data.humidity) && data.humidity > 0 ? data.humidity : null
                    });
                }
                if(isNumeric(data.temperature)){
                    dispatch({
                        key: 'temperature',
                        value: isNumeric(data.temperature) && data.temperature > 0 ? data.temperature : null
                    });
                }
                if(isObject(data.switchBotList)){
                    dispatch({
                        key: 'switchBotList',
                        value: data.switchBotList
                    })
                }
                if(isObject(data.checkerList)){
                    dispatch({
                        key: 'checkerList',
                        value: data.checkerList
                    })
                }

                if(isObject(data.device)){
                    dispatch(before => {
                        const list = before.switchBotList || [];
                        const id = list.findIndex((switchBot: any) => switchBot.id === data.device.id);
                        if(id > -1){
                            list[id] = {...list[id], ...data.switchBot};
                        }
                        return {key: 'switchBotList', value: list};
                    });
                }
                if(isObject(data.checker)){
                    dispatch(before => {
                        const list = before.checkerList || [];
                        const id = list.findIndex((checker: any) => checker.id === data.checker.id);
                        if(id < 0){
                            list.push(data.checker);
                        }else{
                            list[id] = {...list[id], ...data.checker};
                        }
                        return {key: 'checkerList', value: list};
                    });
                }
                if(isObject(data.switchBot)){
                    dispatch(before => {
                        const list = before.switchBotList || [];
                        const id = list.findIndex((switchBot: any) => switchBot.id === data.switchBot.id);
                        if(id < 0){
                            list.push(data.switchBot);
                        }else{
                            list[id] = {...list[id], ...data.switchBot};
                        }
                        return {key: 'switchBotList', value: list};
                    });
                }
            });
            webSocket.addEventListener('close', event => {
                if(event.code === 1003){
                    setAuthStatus(AuthStatus.FALSE);
                }else if(authStatus){
                    reconnectTimeout = setTimeout(connectWebSocket, 1000);
                }
            });

            setSocket(webSocket);
            socketRef.current = webSocket;
        };
        if(authStatus){
            connectWebSocket();
        }else if(socketRef.current){
            setSocket(null);
            socketRef.current.close();
        }
        return () => {
            if(reconnectTimeout){
                clearTimeout(reconnectTimeout);
            }
            if(socketRef.current){
                setSocket(null);
                socketRef.current.close();
            }
        };
    }, [authStatus, dispatch]);

    return (
        <AuthContext.Provider value={{authStatus, setAuthStatus, jwtFetch, socket: socket}}>
            {children}
        </AuthContext.Provider>
    );
};
