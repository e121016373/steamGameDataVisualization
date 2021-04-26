# CPSC 436V Project

### Overview
Steam is arguably the #1 gaming platform for the PC. Each year, millions of people use Steam to buy, play, create, publish and discuss PC games - nearly every computer game in existence can be found on the platform. Thus, analyzing statistics related to Steam can be very useful for understanding trends in the billion-dollar PC gaming industry. We want to create a data visualization that allows the general public to understand the distribution of Steam games, in terms of (but not limited to) genre, popularity and availability. The visualization will provide tools to navigate the large amount of data, such as sorting/filtering mechanisms that are based on user-provided criteria. 

### Data Preprocessing
- Data source: https://www.kaggle.com/nikdavis/steam-store-games 
- Data is first preprocessed in R with data/data.R.
  -Create numRatings variable: numRatings variable is created by taking the sum of positive_ratings and negative_ratings
  - Remove free games
  - Remove games with less than 10 ratings
  - Remove games released before 2007-01-01: Games from 2007-01-1 are excluded because there were only 41 games released in 2006 and even less in years before that.
  - Remove  games released after 2018-12-31: The dataset only contains games released before 2019-05-01. Since the line plot shows the trend of tags per year, it makes sense to remove data from 2019 because it is not complete.
  - Export data.csv with only the relevant variables
- Data is then processed in main.js for line plot and network graph

### Line Plot Functionalities
- <b>Variable Switching</b>: able to switch the variable on y-axis by clicking the switch button on top of the line plot. We have “Median Number of Rating” and “Number of Games” available.
- <b>Tag filtering</b>: on the right we have a list of checkboxes that allows the user to select the tag they want to see. After the checkbox is clicked, the line for the selected tag will show on the plot. The y-axis scale will change accordingly.  
- <b>Tag search</b>: on top of the tag filters, we have a search bar that allows you to search for tags. We are using an external library “FlexSearch” (https://github.com/nextapps-de/flexsearch ) because it provides fast and fuzzy search. 
- <b>Reset Button</b>: under the tag filter, we have a reset button that allows you to reset the tag filter to default setting. The default setting is the top 5 tags that have the most median number of ratings or the most number of games.
![image](https://user-images.githubusercontent.com/32007214/116154988-55d50700-a69e-11eb-8f21-04ba4dfb6f52.png)



### Network Graph Functionalities
- <b>Relationships</b>: The nodes represent tags. The links represent relationships between tags. The size of node encodes the number of games having that tag. The thickness of link encodes the number of times both tags appear together.
- <b>Node category</b>: There are 11 tag categories. Each category is represented by a different color.
- <b>Node dragging</b>: user can drag the nodes and the network will be able to reorganize itself.
- <b>Tooltip</b>: on hovering on a node, information on the corresponding tag's name, median rating count, and number of games will be shown.

![image](https://user-images.githubusercontent.com/32007214/116155035-69806d80-a69e-11eb-84c6-4db6dce7c349.png)


### File Structure
- data
  - data.R
    - Preprocesses the data to create data.csv from steam.csv and steamspy_tag_data.csv
- css
  - style.css
    - styling
- js
  - `linePlot.js`
    - renders the lineplot and includes all the functionalities in lineplot.
    - `initVis()` initializes the plot properties, such as axes and titles. 
      - parses the data from `Map` to `Array` format
      - setup the `FlexSearch` index
      - initializes tag filter
    - `updateVis()` filters and update data
      - group data into years
      - filter out data based on `vis.tagFilter`
      - handles `vis.tagSearchBar` events
      - sort the tags in a descending order with respect to the selected variable
    - `renderVis()` renders everything related to the linePlot
      - handles all the mouseover, click, mouseleave events
      - triggers the interaction when a line is selected
      - triggers the tooltip rendering when the cursor enters the plot
      - handles the tag filter check box events (select/deselect/reset/clear)
  - `network.js`
    - renders the network graph and includes all the functionalities in network graph
    - `initVis()` create the network graph
      - Initialize svg and chartArea
      - Create title text
      - Create force simulation
      - Create links
      - Initialize drag functions to allow user to drag the nodes
      - Create nodes
      - Create circles with mouseover, mouseleave, and click interactivity
      - Create labels
      - Create functionality to make network graph update itself on tick
  - `main.js`
    - preprocesses the csv data
      - group and aggregate data by years
      - generate data for the two variables: `medianRatingCount` and `numGames`
      - prepare data for both linePlot and Network graph
    - uses dispatcher to handle mouse or keyboard events
      - handles five events: `tagSearch`, `tagFilter`, `tagReset`, `tagClear`, `lineplotClick`
    - handles the variable switch button

### External Material
- FlexSearch.js (https://github.com/nextapps-de/flexsearch)
- Game of Thrones Force Directed Graph (https://bl.ocks.org/mohdsanadzakirizvi/6fc325042ce110e1afc1a7124d087130)
