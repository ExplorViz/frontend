import EventEmitter from 'events';

const eventEmitter = new EventEmitter();

export default eventEmitter;

// Usage
/*
Emitting Events:
    import React from 'react';
    import eventEmitter from './eventEmitter';

    const ComponentA = () => {
    const handleClick = () => {
        eventEmitter.emit('eventName', { data: 'some data' });
    };

    return <button onClick={handleClick}>Emit Event</button>;
    };

Listening for Events:
    import React, { useEffect } from 'react';
    import eventEmitter from './eventEmitter';

    const ComponentB = () => {
    useEffect(() => {
        const eventHandler = (data) => {
        console.log('Event received with data:', data);
        };

        eventEmitter.on('eventName', eventHandler);

        // Clean up the event listener on component unmount
        return () => {
        eventEmitter.removeListener('eventName', eventHandler);
        };
    }, []);

    return <div>Listening for events</div>;
    };
*/