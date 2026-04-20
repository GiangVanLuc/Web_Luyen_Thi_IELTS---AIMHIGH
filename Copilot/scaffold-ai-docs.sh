#!/usr/bin/env bash
set -euo pipefail

mkdir -p ai-docs/instructions
mkdir -p ai-docs/rules/frontend
mkdir -p ai-docs/rules/backend
mkdir -p ai-docs/rules/general
mkdir -p ai-docs/templates

touch .cursorrules
touch ai-docs/instructions/frontend-architecture-overview.md
touch ai-docs/instructions/backend-architecture-overview.md
touch ai-docs/instructions/api-integration-guide.md
touch ai-docs/rules/frontend/html-css-conventions.md
touch ai-docs/rules/frontend/dom-manipulation-patterns.md
touch ai-docs/rules/frontend/event-listeners-rules.md
touch ai-docs/rules/frontend/fetch-api-patterns.md
touch ai-docs/rules/backend/spring-boot-conventions.md
touch ai-docs/rules/backend/rest-api-design.md
touch ai-docs/rules/backend/jpa-hibernate-rules.md
touch ai-docs/rules/backend/exception-handling.md
touch ai-docs/rules/general/naming-conventions.md
touch ai-docs/rules/general/git-workflow.md
touch ai-docs/rules/general/database-sql-conventions.md
touch ai-docs/templates/vanilla-js-module.js
touch ai-docs/templates/spring-boot-crud.java

echo "Scaffold created successfully."