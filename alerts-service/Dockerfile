FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY alerts-service/.mvn/ .mvn
COPY alerts-service/mvnw ./
COPY aml-contracts /contracts
RUN ./mvnw -f /contracts/pom.xml install -DskipTests -B
COPY alerts-service/pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY alerts-service/src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
