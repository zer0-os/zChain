docker system prune -f # cleanup
docker build . -t zchain
docker run --name zchain -p 3000:3000 -dit zchain:latest
docker exec -it zchain /bin/bash