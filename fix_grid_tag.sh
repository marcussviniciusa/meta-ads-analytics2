#!/bin/bash

# Find the line number of the unclosed Grid tag
LINE_NUMBER=$(grep -n "<Grid container spacing={3} sx={{ mb: 4 }}>" /home/m/meta-ads-analytics2/frontend/src/pages/Dashboard.js | tail -1 | cut -d':' -f1)

# Add a closing tag after the line containing the opening tag
if [ ! -z "$LINE_NUMBER" ]; then
  NEXT_LINE=$((LINE_NUMBER + 1))
  sed -i "${NEXT_LINE}i\                {/* Content for the Grid */}\n              </Grid>" /home/m/meta-ads-analytics2/frontend/src/pages/Dashboard.js
  echo "Fixed unclosed Grid tag at line $LINE_NUMBER"
else
  echo "Could not find the unclosed Grid tag"
fi

# Remove the extra curly brace at line 3187 if it still exists
# Using grep to check if the line is still problematic
if grep -q "^  };" /home/m/meta-ads-analytics2/frontend/src/pages/Dashboard.js; then
  sed -i '3187s/^  };$/  /' /home/m/meta-ads-analytics2/frontend/src/pages/Dashboard.js
  echo "Fixed extra curly brace at line 3187"
fi

echo "All fixes applied"
