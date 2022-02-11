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


## Deploy on a live server

In the previous section we learned how to setup a local signalling server. In the section we will try to do the same on a live server, so we're able to discover p2p nodes remotely as well. We will deploy using `AWS`, and `heroku`.

### AWS

The steps mentioned here are inspired from [this](https://blog.cloudboost.io/setting-up-an-https-sever-with-node-amazon-ec2-nginx-and-lets-encrypt-46f869159469) article, please read it for a more thorough walkthrough. Steps:

1. Sign up for an AWS account. Try to create and launch an `ec2` instance (in this example we use `ubuntu 20.04` linux distro).

2. Create a new key pair or download an existing one, and save it somewhere before launching the instance. We will use this key pair to connect (ssh) to our ec2 instance later.

3. After launching instance, go to "Security groups" and edit `inbound` rules. Here we’ll need to set up our HTTP and HTTPS protocols because only SSH is enabled by default. Click “Add Rule” with “Type” set to “HTTP” and “Source” set to “Anywhere”. Then repeat this with “HTTPS” instead of “HTTP” and save.

4. Now we’ll setup an Elastic IP for this instance.  On the left pane of the main EC2 page, click “Elastic IPs” then “Allocate new address”. Once you create that IP then navigate back to the ec2 instance, and associate the elastic ip with our fresh ec2 instance.

5. Before continuing with the AWS setup, we'll need to setup a domain. For testing purposes you can use [freenom.com](freenom.com), and register a free domain there. Just use the default settings after registering, we'll edit the nameservers later. For testing i registered the domain `meowtest142.ml`

6. Now, let’s setup a Hosted Zone through Amazon Route 53 to get Name Servers for our newly created domain that point to our new IP address.

7. Navigate to Route 53 service from the aws dashboard, click “Hosted zones” on the left pane, then click “Create Hosted Zone”. Enter your domain then click “Create”. Click “Create Record Set”. Leave the “Name” field blank and put your Elastic IP in the “Value” field, then click “Create”. Click “Create Record Set” again and now put “www” in the “Name” field. Put your IP in the “Value” field again and click “Create”.

8. You should the 4 nameservers again type nameserver (`NS`). Copy these values. Navigate to your freenom account, edit domain settings, nameservers, add custom domains, and add the four domains here. After a bit, your domain should now go to your instance.

9. Now let’s SSH into our new instance. Assuming you saved the `.pem` file in `~`:
```bash
chmod 400 ~/meow-test.pem
ssh -i ~/meow-test.pem ubuntu@<instance-ip>
```

10. Setup `nginx` in your instance:
```bash
sudo wget http://nginx.org/keys/nginx_signing.key
sudo apt-key add nginx_signing.key
cd /etc/apt
sudo nano sources.list
```
At the bottom of that file, append it with:
#
deb http://nginx.org/packages/ubuntu xenial nginx
deb-src http://nginx.org/packages/ubuntu xenial nginx
#

Save the file then:
```bash
sudo apt-get update
sudo apt-get install nginx
```

Then start NGINX:
```bash
sudo service nginx start
```

Now navigate to your Public IP or your domain in your browser. You should see this:
![image](https://user-images.githubusercontent.com/33264364/153651755-2ae6fc10-5bb9-454b-8dee-4050adfaa9b5.png)

11. Now let's setup `let'sencrypt`. Simply do:
```bash
sudo apt install letsencrypt
apt install python3-certbot-nginx
```

Before we get our certification, we need to change a line in our NGINX config file. Open it with this:
```bash
sudo nano /etc/nginx/conf.d/default.conf
```
Next to “server_name”, replace “localhost” with your domain (`meowtest142.ml`) and the “www” subdomain. So for me, it looks like:
```
server {
    listen            80;
    server_name       meowtest142.ml www.meowtest142.ml
    ...
}
```


12. Let's generate the SSL certificates now. Save the file in previous step, then run this with your own domain:
```bash
sudo certbot --nginx -d meowtest142.ml www.meowtest142.ml
```

You should get a success message showing where your new certification files are stored. Now we need to create a new NGINX config file. Navigate here:
```bash
cd /etc/nginx/conf.d
```
You can “ls” to see the default file. We’ll be creating a new one, so lets rename this default one so NGINX doesn’t use it:
```sh
sudo mv default.conf default.conf.bak
```

Then to create and open a new one:
```sh
sudo touch server.conf
sudo nano server.conf
```

Now put this in your new config file and replace `meowtest142.ml` with your own domain:
#
server {
    listen 80;
    listen [::]:80;
    server_name meowtest142.ml www.meowtest142.ml;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name meowtest142.ml www.meowtest142.ml;
    location / {
    proxy_pass http://localhost:3000;
}
ssl_certificate /etc/letsencrypt/live/meowtest142.ml/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/meowtest142.ml/privkey.pem;
ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
ssl_prefer_server_ciphers on;
ssl_ciphers EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
ssl_session_cache shared:SSL:5m;
ssl_session_timeout 1h;
add_header Strict-Transport-Security “max-age=15768000” always;
}
#

All we’re doing here is essentially redirecting all traffic from port 80 (HTTP) to port 443 (HTTPS). Now reload the new config file: `sudo nginx -s reload`.


13. We're almost done! Let's just setup and start the `webrtc-star` server now. Now, first to get Node and npm installed, we’ll install Node Version Manager first:
```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install v16
```

Now:
```
mkdir /home/ubuntu/app
cd /home/ubuntu/app
npm i libp2p-webrtc-star-signalling-server
touch server.js
```

Paste the following code in `server.js`:
```js
const { start } = require('libp2p-webrtc-star-signalling-server');

;(async () => {
const server = await start({
  port: 3000,
  host: '127.0.0.1',
  metrics: false
})

console.log('server started at 127.0.0.1:3000 !');
})();
```

Now we just need to run `node server.js` to start the signalling server. Let’s install a package that will run our server, well, forever:
```bash
npm install forever -g
```

And start the app, well forever:
```bash
forever start server.js
```

We have just deployed a live signalling remote server. Finally after visiting [https://meowtest142.ml/](https://meowtest142.ml/) you should see something like:
![image](https://user-images.githubusercontent.com/33264364/153655720-545509d9-7b08-488e-8e7a-0e09172c7042.png)


### Heroku

Inspiration: [this](https://suda.pl/free-webrtc-star-heroku/) post.
**Prerequiste:** Heroku CLI installed.

In this section we'll try to deploy a live signalling server super fast using `heroku`, preferably without a need to pay for the whole server. Heroku supports Docker containers now and they can be deployed literally with couple of lines! Here's how you do it:

```bash
# Login to Heroku
heroku login
# Login to the Container Registry
heroku container:login
# Clone the webrtc-star repo
git clone https://github.com/libp2p/js-libp2p-webrtc-star.git
cd js-libp2p-webrtc-star
# Create a Heroku app
heroku create
# Build and push the image
heroku container:push web
# Release the image to your app
heroku container:release web
# Scale to one free worker
heroku ps:scale web=1
# Open the app in the browser
heroku open
```

We have a live server deployed using the above method at [https://vast-escarpment-62759.herokuapp.com/](https://vast-escarpment-62759.herokuapp.com/)
![image](https://user-images.githubusercontent.com/33264364/153657884-65d5e303-818a-4f32-8401-bbf95a6be09f.png)