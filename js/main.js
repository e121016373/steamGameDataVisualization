let linePlot;
let highlightedTag;

const dispatcher = d3.dispatch(
  "tagSearch",
  "tagFilter",
  "tagReset",
  "tagClear",
  "lineplotClick"
);

const tagCategoryMap = new Map();

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
function getCategoryColor(category) {
  if (category == 10) {
    return "black";
  } else {
    return colorScale(category * 10);
  }
}

d3.csv("data/data.csv").then((data) => {
  data.forEach((d) => {
    // Create tags array for each game
    d["tags"] = []
    Object.keys(d).forEach((attr) => {
      // Convert ratingCount to numerical values
      if (attr == "numRatings") {
        d[attr] = +d[attr];
      }
      switch(attr) {
        case "numRatings":
          d[attr] = +d[attr];
          break;
        case "tag1":
        case "tag2":
        case "tag3":
        case "tag4":
        case "tag5":
        case "tag6":
        case "tag7":
        case "tag8":
        case "tag9":
        case "tag10":
          if (d[attr]!="") {
            // Replace _ with space
            d["tags"].push(d[attr].replace("_", " "))
          }
          break;
      }
    });
  });

  // Group data by year
  dataByYear = d3.group(data, (d) => d.release_date.slice(0, -6));
  console.log(dataByYear);

  // Set of tag names to include in visualization
  var tagInclusionSet = new Set();
  data.forEach((game) => {
    const tags = game["tags"]
    tags.forEach((tag) => {
      if (!tagInclusionSet.has(tag)) {
        tagInclusionSet.add(tag);
      }
    });
  });
  console.log(tagInclusionSet);

  for (const entry of dataByYear.entries()) {
    // Create map of tag name to numGames released in a specific year for the tag
    var tagNumGamesForYear = new Map();
    entry[1].forEach((game) => {
      const tags = game["tags"];
      tags.forEach((tag) => {
        if (!tagNumGamesForYear.has(tag)) {
          tagNumGamesForYear.set(tag, 1);
        } else {
          tagNumGamesForYear.set(tag, tagNumGamesForYear.get(tag) + 1);
        }
      });
    });
    tagInclusionSet.forEach((tag) => {
      // Remove tag from tagInclusionSet if less than or equal to 5 games were released for the tag this year
      if (tagNumGamesForYear.get(tag) <= 5) {
        tagInclusionSet.delete(tag);
      }
    });
  }
  console.log(tagInclusionSet);

  // Generate aggregated tag data by year
  var tagDataByYear = new Map();
  for (const entry of dataByYear.entries()) {
    const tagDataMap = new Map();
    entry[1].forEach((game) => {
      const tags = game["tags"];
      tags.forEach((tag) => {
        if (!tagInclusionSet.has(tag)) {
          return;
        }
        if (!tagDataMap.has(tag)) {
          relationshipMap = new Map();
          tagDataMap.set(tag, {
            name: tag,
            ratingCounts: [],
            numGames: 0,
            relationships: relationshipMap,
          });
        }
        let tagData = tagDataMap.get(tag);
        tagData.ratingCounts.push(game["numRatings"]);
        tagData.numGames++;
        tags.forEach((otherTag) => {
          if (!tagInclusionSet.has(otherTag)) {
            return;
          }
          if (tag != otherTag) {
            if (!tagData.relationships.has(otherTag)) {
              tagData.relationships.set(otherTag, 1);
            } else {
              let relationship = tagData.relationships.get(otherTag);
              tagData.relationships.set(otherTag, relationship + 1);
            }
          }
        });
      });
    });
    tagDataByYear.set(entry[0], tagDataMap);
  }
  // Generate median rating count for each tag
  tagDataByYear.forEach((yearlyTagData) => {
    yearlyTagData.forEach((tagData) => {
      tagData["medianRatingCount"] = d3.median(tagData["ratingCounts"]);
    });
  });
  console.log(tagDataByYear);

  var networkData = generateNetworkGraphData(tagDataByYear);
  network = new Network(
    {
      parentElement: "#networkgraph",
    },
    networkData
  );

  linePlot = new LinePlot(
    { parentElement: "#line-plot" },
    tagDataByYear,
    dispatcher
  );
  linePlot.updateVis();
});

function generateNetworkGraphData(tagDataByYear) {
  // Generate aggregated tag data within time range
  var timeRange = [2013, 2018];
  var tagDataInTimeRange = new Map();
  for (i = timeRange[0]; i <= timeRange[1]; i++) {
    const yearlyTagData = tagDataByYear.get(i.toString());
    yearlyTagData.forEach((tagData) => {
      if (!tagDataInTimeRange.has(tagData.name)) {
        tagDataInTimeRange.set(tagData.name, {
          name: tagData.name,
          ratingCounts: tagData.ratingCounts,
          numGames: tagData.numGames,
          relationships: tagData.relationships,
        });
      } else {
        let aggregatedtagData = tagDataInTimeRange.get(tagData.name);
        aggregatedtagData.ratingCounts = aggregatedtagData.ratingCounts.concat(
          tagData.ratingCounts
        );
        aggregatedtagData.numGames += tagData.numGames;
        for (const otherTagEntry of tagData.relationships.entries()) {
          if (!aggregatedtagData.relationships.has(otherTagEntry[0])) {
            aggregatedtagData.relationships.set(otherTagEntry[0], 1);
          } else {
            let relationship = aggregatedtagData.relationships.get(
              otherTagEntry[0]
            );
            aggregatedtagData.relationships.set(
              otherTagEntry[0],
              relationship + otherTagEntry[1]
            );
          }
        }
      }
    });
  }

  // Generate median rating count for each tag
  tagDataInTimeRange.forEach((tagData) => {
    tagData["medianRatingCount"] = d3.median(tagData["ratingCounts"]);
  });
  console.log(tagDataInTimeRange);

  // Convert map to array
  var tagArray = Array.from(tagDataInTimeRange.entries()).map((entry) => {
    return {
      name: entry[1].name,
      numGames: entry[1].numGames,
    };
  });

  // Exclude indie
  tagArray = tagArray.filter(function (tag) {
    return tag.name !== "indie";
  });
  // Find top 10 most common tags.
  var topTags = tagArray
    .sort((a, b) => (a.numGames < b.numGames ? 1 : -1))
    .slice(0, 10);
  topTags = topTags.map((tag) => tag.name);
  console.log(topTags);

  // Create name-to-ID map to keep track of node ids
  var tagIDMap = new Map();

  // Create nodes
  var nodes = [];
  var nodeIDCounter = 0;
  tagDataInTimeRange.forEach((tagData) => {
    var relationshipArray = Array.from(tagData.relationships.entries());
    var filteredRelationshipArray = relationshipArray.filter(function (
      relationship
    ) {
      return topTags.includes(relationship[0]);
    });
    var topRelationshipCategory = 10;
    // If the tag is one of the top tags, assign its own category
    if (topTags.includes(tagData.name)) {
      topRelationshipCategory = topTags.indexOf(tagData.name);
    } else if (filteredRelationshipArray.length > 0) {
      topRelationshipCategory = topTags.indexOf(
        filteredRelationshipArray.sort((a, b) => (a[1] < b[1] ? 1 : -1))[0][0]
      );
    }
    tagIDMap.set(tagData.name, nodeIDCounter);
    nodes.push({
      id: nodeIDCounter,
      name: tagData.name,
      medianRatingCount: tagData.medianRatingCount,
      numGames: tagData.numGames,
      category: topRelationshipCategory,
    });
    tagCategoryMap.set(tagData.name, topRelationshipCategory);
    nodeIDCounter++;
  });
  console.log(nodes);

  // Create linkMap to avoid duplicate links
  var linkMap = new Map();
  tagDataInTimeRange.forEach((tagData) => {
    // Only the top 2 links are considered
    var relationshipArray = Array.from(tagData.relationships.entries())
      .sort((a, b) => (a[1] < b[1] ? 1 : -1))
      .slice(0, 2);
    relationshipArray.forEach((relationship) => {
      var source;
      var target;
      if (tagData.name < relationship[0]) {
        source = tagData.name;
        target = relationship[0];
      } else {
        source = relationship[0];
        target = tagData.name;
      }
      var linkID = source + "_" + target;

      if (!linkMap.has(linkID)) {
        linkMap.set(linkID, {
          source: tagIDMap.get(source),
          target: tagIDMap.get(target),
          weight: relationship[1],
        });
      }
    });
  });
  var links = Array.from(linkMap.entries()).map((link) => link[1]);
  console.log(links);

  return { nodes: nodes, links: links };
}

// handle change in filter countries
d3.select("#switch-button").on("change", () => {
  const isMedianClicked = d3
    .select("#median-number-of-rating")
    .property("checked");

  yAxisTitle = isMedianClicked ? "Median Number of Rating" : "Number of Games";
  d3.select("#line-plot-y-axis-title").join("text").text(yAxisTitle);
  linePlot.variableToShow = isMedianClicked ? "median" : "numGames";
  linePlot.updateVis();
});

dispatcher
  // handle tag search event
  .on("tagSearch", (searchResults) => {
    if (searchResults.length > 0) {
      linePlot.searchResults = searchResults;
    } else {
      linePlot.searchResults = [];
    }
    linePlot.updateVis();
  })
  // handle tag filter event
  .on("tagFilter", (tag, isChecked) => {
    if (isChecked) {
      linePlot.tagFilter.push(tag);
    } else {
      linePlot.tagFilter = linePlot.tagFilter.filter((t) => t !== tag);
    }
    linePlot.updateVis();
  })
  // handle reset button event
  .on("tagReset", (variable, data) => {
    linePlot.tagFilter = linePlot.getTopFive(data, variable);
    linePlot.updateVis();
  })
  // handle clear button event
  .on("tagClear", () => {
    linePlot.tagFilter = [];
    linePlot.updateVis();
  })
  // handle line plot click event
  .on("lineplotClick", (data) => {
    const tagName = data[0];
    d3.select("[tag-circle-name='" + highlightedTag + "']").attr(
      "stroke",
      "#f2ff00"
    );

    // Select new tag
    if (highlightedTag == null) {
      highlightedTag = tagName;
      d3.select("[tag-circle-name='" + tagName + "']").attr(
        "stroke",
        "#f2ff00"
      );
    }
    // Deselect selected tag
    else if (highlightedTag === tagName) {
      highlightedTag = null;
      d3.select("[tag-circle-name='" + tagName + "']").attr("stroke", "none");
    }
    // Deselect selected tag and select new tag
    else {
      d3.select("[tag-circle-name='" + highlightedTag + "']").attr(
        "stroke",
        "none"
      );
      highlightedTag = tagName;
      d3.select("[tag-circle-name='" + tagName + "']").attr(
        "stroke",
        "#f2ff00"
      );
    }
  });
