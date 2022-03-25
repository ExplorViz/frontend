##
# Project Title
#
# @file
# @version 0.1

hostname=maba-desktop

export AUTH0_ENABLED=false
# export USER_SERV_URL=https://localhost:8484
export LANDSCAPE_SERV_URL=https://$(hostname):8082
export TRACE_SERV_URL=https://$(hostname):8083
export USER_SERV_URL=https://$(hostname):8084
export COLLAB_SERV_URL=ws://$(hostname):8085
# export COLLABORATION_SERV_URL=https://$(hostname):4444
## some problem with OPTIONS requets?
export COLLABORATION_SERV_URL=https://$(hostname):4446

install: demo-supplier-up serve-ssl

serve:
	ember s

serve-ssl:
	ember s --ssl true --ssl-key .ssl/server.key --ssl-cert .ssl/server.crt

demo-supplier-up:
	docker-compose up -d

demo-supplier-down:
	docker-compose down -v

# end
