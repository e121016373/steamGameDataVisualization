library(tidyverse)
library(dplyr)

data <- read.csv('steam.csv', header = TRUE)
tag_data <- read.csv('steamspy_tag_data.csv', header = TRUE)
tag_data[tag_data == 0] <- NA
data <- left_join(data, tag_data)

k <-10
get_most_relevant_tags <- function(DF, row, k) {
  temp_row1 <<- row
  # Remove non tag columns from consideration
  row <- row[19:length(row)]
  temp_row2 <<- row
  # Create ordered indexes of tags
  ordered_indexes <- order(row,decreasing=TRUE,na.last=TRUE)
  # Take the top k tags
  indexes <- head(ordered_indexes,k)
  valid_indexes <- c()
  for (index in indexes) {
    value <- row[index]
    if (!is.na(value)) {
      valid_indexes <- append(valid_indexes, index)
    }
  }
  # Increment all indexes by 18 because non tag columns were removed in the beginning
  names(DF)[valid_indexes + 18]
}

game_tags <- t(apply(data,1,get_most_relevant_tags, DF=data, k=k))

# Create top 10 tag columns
for (i in seq(1,10)) {
  data[,paste("tag",i,sep = "")] <- ""
}

# Fill top 10 tag columns
for (i in seq(1,length(game_tags))) {
  for (j in seq(1,length(game_tags[[i]]))) {
    tag = game_tags[[i]][j]
    data[i,paste("tag",j,sep = "")] = tag
  }
}

# Create numRatings variable
data$numRatings <- data$positive_ratings + data$negative_ratings

# Preprocess
data <- subset(data, price > 0)
data <- subset(data, numRatings > 10)
data <- subset(data, as.Date("2013-01-01") < as.Date(data$release_date))
data <- subset(data, as.Date(data$release_date) < as.Date("2018-12-31"))

# Select relevant variables
data <- select(data,
               release_date,
               numRatings,
               tag1,
               tag2,
               tag3,
               tag4,
               tag5,
               tag6,
               tag7,
               tag8,
               tag9,
               tag10)

# Save data.csv
write.csv(data, file = "data.csv", row.names = FALSE, quote=FALSE)