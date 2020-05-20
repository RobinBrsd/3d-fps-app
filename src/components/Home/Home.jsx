import React from 'react';
import { Redirect } from 'react-router-dom';
import './Home.scss';

function Home() {
    return (
        <Redirect
            to={{
                pathname: '/selection',
            }}
        />
    );
}

export default Home;
