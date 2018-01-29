function Settings(props) {
  return (
    <Page>
      <Section
        title={<Text bold align="center">CoinCap Coins</Text>}>
        <AdditiveList
          settingsKey='coins'
          onListChange={(list) => {
            list.forEach((item) => {
              item.name = item.name.toUpperCase();
            });
            props.settingsStorage.setItem('coins', JSON.stringify(list));
          }}
          addAction={
            <TextInput
              title="Add a coin"
              label="Coin Symbol"
              placeholder="eg: BTC"
              maxItems="20"
              onAutocomplete={(value) => {
                const c = props.settingsStorage.getItem('coinslist');
                if (!c) {
                  return [{name: value, value}];
                }
                const coinsList = JSON.parse(c);
                const upper = value.toUpperCase();
                return coinsList.filter((item) => {
                  return item.name.toUpperCase().startsWith(upper) ||
                    item.value.toUpperCase().indexOf(upper) > -1;
                });
              }}
              renderAutocomplete={
                (option) => {
                  return (
                    <Text>{option.value}</Text>
                  );
                }
              }
            />
          }
         />
      </Section>
    </Page>
  );
}

registerSettingsPage(Settings);