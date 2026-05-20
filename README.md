This is Reids Branch

Haven't started 

Install dependencies with

Install docker on local machine

https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe?utm_source=docker&utm_medium=webreferral&utm_campaign=docs-driven-download-win-amd64&_gl=1*1kk9gvt*_gcl_au*MTc1MDY1Mjg0Ni4xNzcyNTgzNjQ3*_ga*MTU2MzM1NjI1LjE3NzI1ODM2NDg.*_ga_XJWPQMJYHQ*czE3NzI1ODM2NDckbzEkZzEkdDE3NzI1ODM4MzkkajE5JGwwJGgw


# Docker has specific installation instructions for each operating system.
# Please refer to the official documentation at https://docker.com/get-started/

# Pull the Node.js Docker image:
docker pull node:24-alpine

# Create a Node.js container and start a Shell session:
docker run -it --rm --entrypoint sh node:24-alpine

# Verify the Node.js version:
node -v # Should print "v24.14.0".

# Verify npm version
npm -v # Should print "11.9.0".


###https://nodejs.org/dist/v24.14.0/node-v24.14.0-x64.msi


`npm i`

run to localhost with 

`npm run dev`

For Desktop use only. No plans on mobile development
