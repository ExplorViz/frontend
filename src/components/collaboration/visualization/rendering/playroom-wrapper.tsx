import { usePlayroomConnectionStore } from 'explorviz-frontend/src/stores/collaboration/playroom-connection-store';
import { insertCoin } from 'playroomkit';
import { useRef, useState } from 'react';

interface PlayroomWrapperProps {
    children: React.ReactNode;
}

// This component is responsible for showing the connection lobby

export default function PlayroomWrapper({ children }: PlayroomWrapperProps) {
    const { isConnected, isLobbyOpen, setConnected, closeLobby } = usePlayroomConnectionStore();

    const [roomMode, setRoomMode] = useState<'select' | 'loading'>('select');
    const [joinCode, setJoinCode] = useState('');

    const initRef = useRef(false);

    const initPlayroom = async (codeToJoin?: string) => {
        if (initRef.current) return;
        initRef.current = true;
        setRoomMode('loading');

        try {
            const options: any = {
                skipLobby: false,
                reconnect: false,
            };

            if (codeToJoin) {
                options.roomCode = codeToJoin.trim();
                options.room = codeToJoin.trim();
            }

            await insertCoin(options);

            // If connected successfully, update the connection store (the lobby will close automatically)
            setConnected(true);
        } catch (err) {
            console.error('Playroom Error:', err);
            alert('Connection failed!');
            setRoomMode('select');
            initRef.current = false;
        }
    };

    // If the lobby is open (and we are not connected), do not render the app but only the lobby
    if (isLobbyOpen && !isConnected) {
        return (
            <div style={{
                height: '100vh', width: '100vw',
                background: '#212529',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontFamily: 'sans-serif'
            }}>
                <div style={{ background: '#343a40', padding: '40px', borderRadius: '10px', minWidth: '350px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                    <h2 style={{ marginBottom: '30px', fontWeight: 'bold' }}>Multiplayer Setup</h2>

                    {roomMode === 'select' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => initPlayroom()}
                                style={{ width: '100%' }}
                            >
                                Create New Room
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#adb5bd' }}>
                                <hr style={{ flex: 1 }} /> or <hr style={{ flex: 1 }} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    className="form-control"
                                    placeholder="CODE"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px' }}
                                />
                                <button
                                    className="btn btn-success"
                                    onClick={() => initPlayroom(joinCode)}
                                    disabled={!joinCode}
                                >
                                    Connect
                                </button>
                            </div>

                            <button
                                className="btn btn-outline-light mt-4"
                                onClick={closeLobby}
                                style={{ width: '100%' }}
                            >
                                Back to the app (Offline)
                            </button>
                        </div>
                    ) : (
                        <div className="d-flex flex-column align-items-center">
                            <div className="spinner-border text-light mb-3" role="status"></div>
                            <p>Connecting To Playroom Servers...</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // If the lobby is not open, just render the app
    return (
        <>
            {children}
        </>
    );
}