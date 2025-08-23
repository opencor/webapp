<template>
  <div class="h-screen">
    <Splitter class="h-full" layout="vertical">
      <SplitterPanel class="flex items-center justify-center bg-blue-500" :size="15">Top panel...</SplitterPanel>
      <SplitterPanel :size="50">
        <Splitter>
          <SplitterPanel class="flex items-center justify-center bg-red-500" :size="15">Left panel...</SplitterPanel>
          <SplitterPanel :size="50">
            <OpenCOR />
            <!-- <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.cellml" /> -->
            <!-- <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.omex" /> -->
            <!-- <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex" /> -->
            <!-- <OpenCOR omex="https://models.physiomeproject.org/workspace/b7c/rawfile/e0ae8d2d56aaaa091e23e1ee7e84cacbda1dfb6b/lorenz.omex" /> -->
          </SplitterPanel>
          <SplitterPanel class="flex items-center justify-center bg-red-500" :size="35">Right panel...</SplitterPanel>
        </Splitter>
      </SplitterPanel>
      <SplitterPanel class="flex items-center justify-center bg-blue-500" :size="35">Bottom panel...</SplitterPanel>
    </Splitter>
  </div>
</template>
