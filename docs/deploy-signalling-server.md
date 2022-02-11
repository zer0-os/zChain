# WebRTC Star Signalling server

Signaling is the process of coordinating communication. In order for a WebRTC app to set up a call, its clients need to exchange the following information:

+ Session-control messages used to open or close communication
+ Error messages
+ Media metadata, such as codecs, codec settings, bandwidth, and media types
+ Key data used to establish secure connections
+ Network data, such as a host's IP address and port as seen by the outside world

wrt `libp2p`, signalling servers are helpful for peer discovery as well (not just transport): Nodes using the `libp2p-webrtc-star` transport will connect to a known point in the network, a rendezvous point where they can learn about other nodes (Discovery) and exchange their SDP offers (signalling data). To read more about webrtc transport and signalling servers in general, click [here](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/).

Public libp2p webrtc-star servers are deployed at at `wrtc-star1.par.dwebops.pub` and `wrtc-star2.sjc.dwebops.pub`, that can be used for practical demos and experimentation. In the next sections we will learn how to deploy our own singalling server locally, on AWS, and on heroku.

## Deploy on local

The most direct way to deploy locally should be this one -- [https://github.com/libp2p/js-libp2p-webrtc-star/blob/master/packages/webrtc-star-signalling-server/DEPLOYMENT.md#ssl--localhost-development](https://github.com/libp2p/js-libp2p-webrtc-star/blob/master/packages/webrtc-star-signalling-server/DEPLOYMENT.md#ssl--localhost-development), but this produces an error atm. Issue opened [here](https://github.com/libp2p/js-libp2p-webrtc-star/issues/402). So we will move to a bit manual setup.

First install nginx & certbox in your system. We will assume we want to use the domain `localdomain.test`. You can generate the certs using the following commands:
```bash
mkcert localdomain.test
mkdir -p nginx/certs
cp localdomain.test-key.pem nginx/certs/localdomain.test.key
cp localdomain.test.pem nginx/certs/localdomain.test.crt
sudo -- sh -c "echo '127.0.0.1 localdomain.test' >> /etc/hosts"
```

The nginx/certs would look something like this:

```bash
➜  $ tree nginx
nginx
└── certs
    ├── localdomain.test.crt
    └── localdomain.test.key
```

After generating certs you can simply "up" the docker-compose file (present in `./docker-compose-files/docker-compose.yml).

Terminal log looks like:
![image](https://user-images.githubusercontent.com/33264364/153536334-0d9f35fa-d483-49e1-aa3e-3feed6abe586.png)

Opening the link on browser looks like:
![image](https://user-images.githubusercontent.com/33264364/153536308-c1d33a3f-52fa-44fe-a887-b1ecc1a07ff0.png)




