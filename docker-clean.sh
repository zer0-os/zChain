# Stop all containers
docker stop `docker ps -qa`

# Remove all containers
docker rm `docker ps -qa`

# Remove all images
docker rmi -f `docker images -qa `


# Remove all networks
docker network rm `docker network ls -q`

docker volume prune -f

# Remove all volumes
docker volume rm $(docker volume ls -qf)